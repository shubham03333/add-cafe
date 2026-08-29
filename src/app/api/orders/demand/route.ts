import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { parseOrderItems } from '@/lib/order-utils';
import { addDays } from '@/lib/date-range';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const days = Math.min(366, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));

    let whereSql = 'WHERE order_time >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status != \'cancelled\'';
    let params: any[] = [days];

    if (startDate && endDate && YMD.test(startDate) && YMD.test(endDate) && startDate <= endDate) {
      whereSql = 'WHERE order_time >= ? AND order_time < ? AND status != \'cancelled\'';
      params = [`${startDate} 00:00:00`, `${addDays(endDate, 1)} 00:00:00`];
    }

    const orders = await executeQuery(
      `SELECT items, total
       FROM orders
       ${whereSql}
       LIMIT 15000`,
      params
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
