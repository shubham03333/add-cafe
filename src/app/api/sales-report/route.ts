import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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

    // Query to get all served orders in the date range
    const orders = await executeQuery(
      `SELECT items FROM orders WHERE order_time BETWEEN ? AND ? AND status = 'served'`,
      [startDate, endDate]
    ) as any[];

    // Aggregate item quantities across all orders
    const itemSalesMap: Record<string, { name: string; quantity: number }> = {};

    orders.forEach(order => {
      let items;
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (error) {
        console.warn('Failed to parse items for order:', order.items);
        return;
      }
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item.name && item.quantity) {
            if (itemSalesMap[item.name]) {
              itemSalesMap[item.name].quantity += item.quantity;
            } else {
              itemSalesMap[item.name] = { name: item.name, quantity: item.quantity };
            }
          }
        });
      }
    });

    // Convert to array and sort by quantity descending
    const topItems = Object.values(itemSalesMap)
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
