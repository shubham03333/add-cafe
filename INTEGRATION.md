# POS ↔ Digital Catalog integration (Phase 1)

POS remains the source of truth for orders, kitchen, billing, inventory, and sales.
The catalog talks to POS only through `/api/integrations/*`. Customer browsing must never hit TiDB.

## Sequence

### Menu sync (Phase 2 on catalog)
1. Catalog cron/admin calls `GET /api/integrations/menu` with `Authorization: Bearer <INTEGRATION_API_KEY>`.
2. POS returns cached TiDB menu (60s TTL) plus `etag` / `content_hash`.
3. Catalog upserts into Supabase. Customer `/menu` reads Supabase only.

### Order submit (Phase 3 on catalog)
1. Catalog generates an `idempotency_key` per checkout attempt.
2. Catalog `POST /api/integrations/orders`.
3. POS validates table + available items + total, then inserts the same way as waiter POS (`preparing` / `pending` / daily order number).
4. Repeat POST with the same key returns the stored response.

### Webhooks
1. Waiter/chef/pay updates a catalog-originated order (`external_source = digital_catalog` or `external_ref` set).
2. POS HMAC-SHA256 signs the JSON body with `INTEGRATION_WEBHOOK_SECRET`.
3. POS POSTs to `CATALOG_WEBHOOK_URL` with `X-Webhook-Signature: sha256=<hex>` without blocking the staff response.
4. Catalog may `GET /api/integrations/orders/:id` once if the webhook is missed (no polling).

## Auth
- Header: `Authorization: Bearer <INTEGRATION_API_KEY>` or `X-Integration-Key`
- 60 requests / IP / minute on integration routes only
- Staff `/api/orders`, `/api/menu`, `/dashbord`, `/chef`, `/admin` are unchanged and do not use this key

## Idempotency
- Key max 64 chars, unique
- Stored in `integration_idempotency` (and `orders.idempotency_key` after migration)
- Replay returns the original `{ id, order_number, status, created_at }`

## Table mapping
POS uses `tables_master.table_code` (string). Catalog QR uses integer `/t/{n}`. Map `3` → `"3"` unless a table uses codes like `T1`.

## Rollback
1. Unset `CATALOG_WEBHOOK_URL` and `INTEGRATION_API_KEY` on POS.
2. Leave migration columns in place; they are nullable and unused by staff UI.
3. Integration routes return 503 without the API key.

## Manual SQL
Run `scripts/add-integration-columns.sql` on TiDB before relying on webhooks, delta sync, or durable idempotency.
If you skip it, staff flows still work. Integration order create falls back to the original `orders` insert; webhooks no-op if `external_source` is missing.

## Phase 5 — POS customer route

`CUSTOMER_ORDERING_ENABLED` defaults off. `/customer` shows “Order via QR menu” and does not load `CustomerOrderSystem`.
Set `NEXT_PUBLIC_CATALOG_URL` for the link. Bill print uses `NEXT_PUBLIC_CATALOG_REVIEW_URL_TEMPLATE` with `{table}` when a dine-in table is known; otherwise the old Google QR is used.

