function unknownColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Unknown column') || message.includes('ER_BAD_FIELD_ERROR');
}

export function stockoutDateValue(value: unknown) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    return year && month && day ? `${year}-${month}-${day}` : null;
  }
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export function isOutOfStockToday(stockoutDate: unknown, today: string) {
  const day = stockoutDateValue(stockoutDate);
  return Boolean(day && day === today);
}

export async function withStockoutFlag<T extends Record<string, unknown>>(rows: T[]) {
  const { getTodayDateString } = await import('@/lib/timezone-dynamic');
  const today = await getTodayDateString();
  return rows.map((row) => ({
    ...row,
    out_of_stock: isOutOfStockToday(row.stockout_date, today),
  }));
}

export async function setMenuItemStockout(id: string | number, out: boolean) {
  const { executeQuery } = await import('@/lib/db');
  const { getTodayDateString } = await import('@/lib/timezone-dynamic');
  const today = await getTodayDateString();
  try {
    await executeQuery('UPDATE menu_items SET stockout_date = ? WHERE id = ?', [out ? today : null, id]);
  } catch (error) {
    if (!unknownColumn(error)) throw error;
    throw new Error('Run scripts/add-daily-stockout.sql on TiDB first');
  }
  return { id: Number(id), out_of_stock: out, stockout_date: out ? today : null };
}
