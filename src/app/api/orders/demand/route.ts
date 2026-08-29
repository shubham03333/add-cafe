import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { parseOrderItems } from '@/lib/order-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(366, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));

    const orders = await executeQuery(
      `SELECT items, total
       FROM orders
       WHERE order_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND status != 'cancelled'
       LIMIT 15000`,
      [days]
    ) as any[];

    const dishDataMap = new Map<number, { name: string; quantity: number; revenue: number }>();

    (orders || []).forEach(order => {
      const items = parseOrderItems(order.items);
      items.forEach((item: any) => {
        if (!item?.id || !item?.name) return;
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const existing = dishDataMap.get(item.id);
        if (existing) {
          existing.quantity += quantity;
          existing.revenue += price * quantity;
        } else {
          dishDataMap.set(item.id, {
            name: item.name,
            quantity,
            revenue: price * quantity,
          });
        }
      });
    });

    const demands = Array.from(dishDataMap.entries()).map(([dishId, data]) => ({
      dishId,
      dishName: data.name,
      totalQuantity: data.quantity,
      totalRevenue: data.revenue,
    }));

    return NextResponse.json(demands);
  } catch (error) {
    console.error('Error fetching demand analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demand analysis' },
      { status: 500 }
    );
  }
}
