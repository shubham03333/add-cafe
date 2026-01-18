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

    // Fetch orders data for processing top items in JS (TiDB doesn't support JSON_TABLE)
    const ordersData = await executeQuery(`
      SELECT items
      FROM orders
      WHERE order_time BETWEEN ? AND ?
        AND status = 'served'
        AND JSON_VALID(items) = 1
    `, [startDate, endDate]) as any[];

    console.log('Orders data count:', ordersData.length);
    console.log('Sample order items:', ordersData[0]?.items);

    // Process items in JS to aggregate top items
    const itemMap = new Map<string, number>();
    ordersData.forEach(order => {
      try {
        const items = order.items;
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name?.trim();
            const quantity = parseInt(item.quantity) || 0;
            if (name && quantity > 0) {
              itemMap.set(name, (itemMap.get(name) || 0) + quantity);
            }
          });
        }
      } catch (e) {
        // Skip invalid items
      }
    });

    // Convert to array and sort by quantity desc, limit 10
    const topItems = Array.from(itemMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

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
