import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getTodayDateString, getYesterdayDateString } from '@/lib/timezone-dynamic';
import { getSqlDayRange } from '@/lib/date-range';
import { cache, CACHE_KEYS } from '@/lib/cache';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const resetToday = url.searchParams.get('resetToday') === 'true';
    
    if (resetToday) {
      // Reset today's sales to 0 (manual reset from admin panel)
      const todayIST = await getTodayDateString();
      
      console.log(`🔄 Manual reset of today's sales initiated for: ${todayIST}`);

      // Reset today's sales to 0 in the daily_sales table
      await executeQuery(`
        INSERT INTO daily_sales (sale_date, total_orders, total_revenue) 
        VALUES (?, 0, 0) 
        ON DUPLICATE KEY UPDATE 
          total_orders = 0,
          total_revenue = 0,
          updated_at = CURRENT_TIMESTAMP
      `, [todayIST]);

      console.log(`✅ Today's sales reset to 0 for ${todayIST}`);
      cache.delete(CACHE_KEYS.TODAY_SALES);
      cache.delete(CACHE_KEYS.TOTAL_REVENUE);

      return NextResponse.json({ 
        success: true, 
        message: "Today's sales reset to 0 successfully",
        data: {
          date: todayIST,
          total_orders: 0,
          total_revenue: 0
        }
      });
    } else {
      // Archive yesterday's sales (automatic end-of-day process)
      const yesterdayIST = await getYesterdayDateString();
      const { start, end } = getSqlDayRange(yesterdayIST);
      
      console.log(`🔄 Manual daily sales archive initiated for: ${yesterdayIST}`);

      // 1. Get total sales for yesterday from orders table
      const yesterdaySales = await executeQuery(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total) as total_revenue
        FROM orders 
        WHERE order_time >= ? AND order_time < ?
          AND status = 'served'
      `, [start, end]) as any[];

      const totalOrders = yesterdaySales?.[0]?.total_orders || 0;
      const totalRevenue = yesterdaySales?.[0]?.total_revenue || 0;

      console.log(`💰 Yesterday's sales: ${totalOrders} orders, ₹${totalRevenue}`);

      if (totalOrders > 0) {
        // 2. Update daily_sales table with finalized totals
        await executeQuery(`
          INSERT INTO daily_sales (sale_date, total_orders, total_revenue) 
          VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE 
            total_orders = VALUES(total_orders),
            total_revenue = VALUES(total_revenue),
            updated_at = CURRENT_TIMESTAMP
        `, [yesterdayIST, totalOrders, totalRevenue]);

        console.log(`✅ Daily sales archived successfully for ${yesterdayIST}`);
      } else {
        console.log('ℹ️ No sales recorded yesterday, skipping archive');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Yesterday\'s sales archived successfully',
        data: {
          date: yesterdayIST,
          total_orders: totalOrders,
          total_revenue: totalRevenue
        }
      });
    }

  } catch (error) {
    console.error('❌ Error during daily sales reset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset daily sales',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
