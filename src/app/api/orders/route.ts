
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrderRequest, Order } from '@/types';

// GET all orders with optional status filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    
    const includeServed = searchParams.get('includeServed') === 'true';
    let query = 'SELECT * FROM orders';
    let whereClauses = [];
    
    if (!includeServed) {
        whereClauses.push("status != 'served'");
    }
    
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (statusFilter) {
        const statuses = statusFilter.split(',').filter(status => validStatuses.includes(status.trim()));
        if (statuses.length > 0) {
            whereClauses.push(`status IN ('${statuses.join("', '")}')`);
        }
    }
    
    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }
    query += ' ORDER BY order_time ASC';

    const rows = await executeQuery(query) as any[];
    console.log(`[ORDERS API] Fetching orders - includeServed: ${includeServed}, statusFilter: ${statusFilter}`);
    console.log(`[ORDERS API] Query: ${query}`);
    console.log(`[ORDERS API] Found ${rows.length} orders`);

    // Log order statuses for debugging
    const statusCounts = rows.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`[ORDERS API] Status breakdown:`, statusCounts);

    const orders = rows.map(row => {
      // Check if items is already an object or needs parsing
      let itemsData = row.items;
      if (typeof row.items === 'string') {
        try {
          itemsData = JSON.parse(row.items);
        } catch (parseError) {
          console.warn('Failed to parse items JSON:', row.items);
          itemsData = [];
        }
      }

      return {
        ...row,
        items: itemsData
      };
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const orderId = uuidv4(); // Generate unique order ID
    const currentDate = new Date();
    const today = currentDate.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Fetch the last order number for today
    const lastOrderQuery = 'SELECT MAX(order_number) AS last_order_number FROM orders WHERE DATE(order_time) = ?';
    const lastOrderResult: any[] = await executeQuery(lastOrderQuery, [today]) as any[];
    const lastOrderNumber = lastOrderResult[0]?.last_order_number || '0'; // Default to '0' if no orders exist

    // Increment the order number
    const newOrderNumber = (parseInt(lastOrderNumber) + 1).toString().padStart(3, '0'); // Pad to 3 digits

    // Set initial status to 'preparing' and payment status to 'pending'
    await executeQuery(
      'INSERT INTO orders (id, order_number, items, total, status, payment_status) VALUES (?, ?, ?, ?, ?, ?)',
      [orderId, newOrderNumber, JSON.stringify(body.items), body.total, 'preparing', 'pending']
    );

    return NextResponse.json({ id: orderId, success: true, order_number: newOrderNumber });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
