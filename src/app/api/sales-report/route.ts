import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { logMemoryUsage } from '@/lib/memory-monitor';

export async function GET(request: NextRequest) {
  try {
    logMemoryUsage('/api/sales-report');

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    // Query to get total revenue and total orders for the date range
    const salesSummary = await executeQuery(
      `SELECT
        SUM(total) as total_revenue,
        COUNT(*) as total_orders
       FROM orders
       WHERE order_time BETWEEN ? AND ?
         AND payment_status = 'paid'`,
      [startDate, endDate]
    ) as any[];

    // Query to get daily sales breakdown - format date as YYYY-MM-DD string
    const dailySales = await executeQuery(
      `SELECT
        DATE_FORMAT(order_time, '%Y-%m-%d') as date,
        SUM(total) as revenue,
        COUNT(*) as orders
       FROM orders
       WHERE order_time BETWEEN ? AND ?
         AND payment_status = 'paid'
       GROUP BY DATE_FORMAT(order_time, '%Y-%m-%d')
       ORDER BY date DESC`,
      [startDate, endDate]
    ) as any[];

    // Check for manual revenue overrides
    const manualOverrides = await executeQuery(
      `SELECT date, manual_revenue, original_revenue
       FROM revenue_overrides
       WHERE date BETWEEN ? AND ?`,
      [startDate, endDate]
    ) as any[];

    // Create a map of manual overrides
    const overrideMap = new Map();
    manualOverrides.forEach(override => {
      overrideMap.set(override.date, {
        manual_revenue: override.manual_revenue,
        original_revenue: override.original_revenue
      });
    });

    // Apply manual overrides to daily sales
    // Remove manual overrides to avoid duplicate rows and overridden revenue for 4 Sep 2025
    const adjustedDailySales = dailySales;

    // Remove manual overrides for dates that have no orders but have manual revenue
    // No additional entries added for manual overrides

    // Sort by date again after adding manual overrides
    adjustedDailySales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Optimized query: Aggregate item sales directly in database using JSON functions
    // This replaces the in-memory processing that was loading all orders into memory
    const topItems = await executeQuery(`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(item.value, '$.name')) as name,
        SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(item.value, '$.quantity')) AS UNSIGNED)) as quantity
      FROM orders o
      CROSS JOIN JSON_TABLE(
        o.items,
        '$[*]' COLUMNS (
          value JSON PATH '$'
        )
      ) as item
      WHERE o.order_time BETWEEN ? AND ?
        AND o.status = 'served'
        AND JSON_VALID(o.items) = 1
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(item.value, '$.name'))
      HAVING name IS NOT NULL AND name != ''
      ORDER BY quantity DESC
      LIMIT 10
    `, [startDate, endDate]) as any[];

    const result = {
      total_revenue: salesSummary[0]?.total_revenue || 0,
      total_orders: salesSummary[0]?.total_orders || 0,
      daily_sales: adjustedDailySales || [],
      top_items: topItems
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating sales report:', error);
    return NextResponse.json(
      { error: 'Failed to generate sales report' },
      { status: 500 }
    );
  }
}
