import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

interface PrintCommand {
  type: 'text' | 'line' | 'cut';
  content?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

function generatePrintData(order: any, items: any[]): { printData: PrintCommand[] } {
  const printData: PrintCommand[] = [
    { type: 'text', content: 'Cafe Order System', align: 'center', bold: true },
    { type: 'text', content: `Order #${order.order_number}`, align: 'center' },
    { type: 'text', content: `Date: ${new Date(order.order_time).toLocaleString()}`, align: 'left' },
    { type: 'line' },
  ];

  items.forEach(item => {
    printData.push({ type: 'text', content: `${item.name} x${item.quantity}`, align: 'left' });
    printData.push({ type: 'text', content: `$${item.price * item.quantity}`, align: 'right' });
  });

  printData.push({ type: 'line' });
  printData.push({ type: 'text', content: `Total: $${order.total}`, align: 'right', bold: true });
  printData.push({ type: 'cut' });

  return { printData };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const orderQuery = 'SELECT * FROM orders WHERE id = ?';
    const orderResult: any[] = await executeQuery(orderQuery, [id]) as any[];

    if (orderResult.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult[0];

    // Parse items if it's a string
    let items = order.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (parseError) {
        console.warn('Failed to parse items JSON:', items);
        items = [];
      }
    }

    // Generate printer-compatible JSON
    const printData = generatePrintData(order, items);

    return NextResponse.json(printData);
  } catch (error) {
    console.error('Error fetching order for print:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
