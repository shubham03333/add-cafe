import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { addDays } from '@/lib/date-range';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const IST_SHIFT = 'DATE_ADD(order_time, INTERVAL 330 MINUTE)';

function periodSql(period: string) {
  switch (period) {
    case 'daily':
      return `DATE_FORMAT(${IST_SHIFT}, "%Y-%m-%d")`;
    case 'weekly':
      return `DATE_FORMAT(DATE_SUB(${IST_SHIFT}, INTERVAL WEEKDAY(${IST_SHIFT}) DAY), "%Y-%m-%d")`;
    case 'monthly':
      return `DATE_FORMAT(${IST_SHIFT}, "%Y-%m")`;
    case 'yearly':
      return `DATE_FORMAT(${IST_SHIFT}, "%Y")`;
    default:
      return `DATE_FORMAT(${IST_SHIFT}, "%Y-%m-%d %H:00:00")`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let period = searchParams.get('period') || 'hourly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const days = Math.min(366, Math.max(1, parseInt(searchParams.get('days') || '7', 10)));

    const validPeriods = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
      period = 'daily';
    }

    const groupBy = periodSql(period);

    let whereSql = 'WHERE order_time >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    let params: any[] = [days];
    let rangeDays = days;

    if (startDate && endDate && YMD.test(startDate) && YMD.test(endDate) && startDate <= endDate) {
      const span = Math.ceil(
        (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000
      ) + 1;
      if (span > 365 * 15) {
        return NextResponse.json({ success: false, error: 'Date range cannot exceed 15 years' }, { status: 400 });
      }
      whereSql = 'WHERE order_time >= ? AND order_time < ?';
      params = [`${startDate} 00:00:00`, `${addDays(endDate, 1)} 00:00:00`];
      rangeDays = span;
    }

    const rows = await executeQuery(
      `SELECT
        ${groupBy} as time_period,
        COUNT(*) as order_count,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value
       FROM orders
       ${whereSql}
       GROUP BY ${groupBy}
       ORDER BY time_period DESC
       LIMIT 400`,
      params
    ) as any[];

    const total_orders = (rows || []).reduce((sum, row) => sum + Number(row.order_count || 0), 0);

    return NextResponse.json({
      success: true,
      data: rows || [],
      total_orders,
      period,
      days: rangeDays
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order analytics' },
      { status: 500 }
    );
  }
}
