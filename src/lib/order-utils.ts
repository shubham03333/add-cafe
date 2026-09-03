export function parseOrderItems(items: unknown): any[] {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function mapOrderRow(row: any) {
  return {
    ...row,
    items: parseOrderItems(row.items),
    payment_status: row.payment_status || 'pending',
    payment_mode: row.payment_mode || null,
  };
}

export const ORDER_LIST_COLUMNS = `o.id, o.order_number, o.items, o.total, o.status, o.payment_status, o.payment_mode, o.order_time, o.order_type, o.table_id`;
export const ORDER_LIST_COLUMNS_WITH_SOURCE = `${ORDER_LIST_COLUMNS}, o.external_source`;
