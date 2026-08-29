# Adda Cafe Enhancement Notes (Aug 2026)

This document covers the performance work already shipped on `feature/advancement` and the dashboard UI/UX pass on `/dashbord` (`CafeOrderSystem`). Do not treat this as a rewrite of order, payment, or print behaviour.

---

## 1. Production migration — run this SQL on TiDB

**File:** `scripts/tidb-performance-indexes.sql`

Apply from a machine that can reach the cluster (TiDB SQL editor or):

```bash
node scripts/run-sql.js scripts/tidb-performance-indexes.sql
```

| Index | Purpose |
| --- | --- |
| `idx_orders_status_time` `(status, order_time)` | Chef queue and active-order lists |
| `idx_orders_payment_time` `(payment_status, order_time)` | Today’s paid sales |
| `idx_orders_table_active` `(table_id, order_type, status)` | Table occupancy |
| `idx_orders_time_number` `(order_time, order_number)` | Daily order-number allocation |
| `idx_system_settings_name` `(setting_name)` | Timezone / settings lookup |

The script uses `CREATE INDEX IF NOT EXISTS` and `ANALYZE TABLE`. It is safe to re-run. It does **not** drop duplicate legacy indexes.

**App admin user (optional, cafe login — not a TiDB account):**

```sql
INSERT INTO users (username, password, role_id)
VALUES (
  'admin',
  '$2b$12$FEDQ2keIDKq8sBAHS2BfVeEdFeUCE/NOMy0tN19v6QYgv2zg.OaQS',
  (SELECT id FROM user_roles WHERE role_name = 'admin' LIMIT 1)
)
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role_id = VALUES(role_id);
```

Password for that hash is `admin123`. Rotate it after first login.

**Security:** `TIDB_ADDA_TABLE_DDLS.sql` previously contained live cluster credentials. Rotate that password in TiDB Cloud and keep secrets out of git.

---

## 2. Backend / query performance (already in git)

### New helpers

| File | Role |
| --- | --- |
| `src/lib/date-range.ts` | Index-friendly day bounds (`order_time >= start AND < end`) instead of `DATE(order_time)` |
| `src/lib/order-utils.ts` | Shared JSON item parse / list columns |
| `src/lib/stock.ts` | Stock adjustments without an HTTP hop to localhost |
| `src/app/api/orders/demand/route.ts` | Demand analysis without `loadAll=true` of full orders |

### Database layer (`src/lib/db.ts`)

- Use `pool.query()` (text protocol) instead of prepared `execute()` to cut WAN round-trips to TiDB Cloud.
- Smaller pool (`10` local / `5` on Vercel), keep-alive, compression, bounded queue, retry on dropped connections.
- TLS when host looks like TiDB Cloud.

### Cache (`src/lib/cache.ts`)

- TTL is seconds (was accidentally applied twice as milliseconds).
- Prefix invalidation for menu keys.
- Short TTLs: menu, today’s sales (~8s), tables (~5s), total revenue (~30s), timezone.

### API behaviour (same payloads, cheaper queries)

- **Orders GET:** default returns an array of active orders (limit 200) without `COUNT(*)`. Pagination only when `page` / `paginated` is present. `order_number` filters to today.
- **Orders POST:** next number uses a time range, not `DATE(order_time)`.
- **Chef:** selected columns, status + time, limit 150.
- **Paginated / today sales / sales report / analytics / daily-sales reset / admin revenue:** range predicates; parallel queries where it was sequential; today’s sales is one aggregation query.
- **Tables:** occupancy via one `DISTINCT` join, not per-table `EXISTS`.
- **Serve order:** in-process stock update (no `localhost:3000/api/inventory`).
- **Demand page:** `/api/orders/demand?days=30`.

### Client polling (same screens, less load)

- POS: orders every 5s; sales every 15s (not on every order poll); menu every 30s.
- Chef: 4s.
- Inventory dashboard: 15s.
- Customer: poll by today’s `order_number` when placing.

---

## 3. Dashboard UI/UX critique (`/dashbord`)

POS staff use this page under time pressure. Existing flows (takeaway default, table sidebar, place order, edit, print, pay, pending swipe) stay as they are.

### Problems observed

1. **Header is mostly icon-only** — Chef, history, and report are easy to mix up; no cafe name or session control.
2. **No logout** — session lives in `localStorage` with no way out of the POS shell.
3. **Offline is silent** — `useOfflineStatus` exists but nothing is shown when the network drops.
4. **Place Order sits above a long menu grid** — on a phone, adding items pushes the submit control off-screen.
5. **Favorites reset on refresh** — stars were memory-only.
6. **Popular items were fetched and never shown.**
7. **Search has no clear control, no `/` shortcut, weak labels.**
8. **Menu tiles do not show quantity already in the current ticket.**
9. **Error state forces a full page reload.**
10. **Auth splash uses a huge spinner** with little context.
11. **Sales numbers are unformatted** (`₹1234` vs `₹1,234`).
12. **Modals ignore Escape.**

### Improvements implemented (non-breaking)

- Brand, clock, offline pill, labelled actions, logout (clears the same `localStorage` keys login sets).
- Sticky “Place Order” bar on small screens; existing current-order card and API unchanged.
- Edit-order modal: Cancel/Save pinned in a fixed bar; item list and menu scroll above it.
- Persist favorites under `adda-menu-favorites`.
- Popular badge on tiles using existing `top_items` data.
- Quantity chip on tiles when the item is in `buildingOrder`.
- Search: `type="search"`, clear, `aria-label`, `/` focuses search when not in an input.
- Escape closes the topmost overlay (bill, edit, reports, payment, confirm).
- Retry re-fetches menu/orders instead of `location.reload()`.
- INR formatting with `en-IN`.
- Lighter auth loading on `src/app/dashbord/page.tsx`.
- Visible order mode (Takeaway vs selected table) next to search.

### Intentionally not changed

- Order create/update/pay/print URLs and payloads.
- Takeaway header button remains commented (previous product choice).
- POS theme switcher (context exists; not wired across POS).
- Polling intervals from the performance pass.
- Clock, cafe name, and logout were removed from the POS header by request.

---

## 5. Admin UI (`/admin`)

Critique: sales KPIs were fetched and never shown; tabs were long and duplicated the Package icon; “charts” were CSS bars; availability used emojis; no menu search; tables hid occupancy; layout was a narrow gray box.

Shipped (same APIs):

- Default **Overview** tab (`src/components/AdminOverview.tsx`) with Recharts: revenue area, orders bar, payment donut, top dishes. Range 7 / 30 / 90 days. Reset today still uses `/api/daily-sales/reset`.
- Analytics tab: real bar + area charts (`OrderAnalyticsChart.tsx`).
- Sticky header + tabs, shorter labels, occupancy on tables, menu search + category chips, Show/Hide instead of emojis.
- Dependency: `recharts`.

Verify: log in as admin → Overview charts load → Menu search/edit/save positions → Tables occupancy → Analytics period filters → Reports unchanged.

---

## 6. How to verify

1. Run `scripts/tidb-performance-indexes.sql` on production TiDB.
2. Restart the Next.js app.
3. Log in as dashboard role → `/dashbord`.
4. Search, favourite, add items, confirm sticky Place Order on a narrow viewport, place a takeaway order.
5. Open pending (tap or swipe), print/pay as today.
6. Toggle airplane mode and confirm the offline banner.
7. Refresh and confirm favourites remain.
8. Escape closes modals; `/` focuses search.
9. Log in as admin → `/admin` Overview charts and remaining tabs.