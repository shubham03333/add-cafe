
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrderRequest, Order } from '@/types';

// GET orders with pagination (default) or all orders if explicitly requested
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    const includeServed = searchParams.get('includeServed') === 'true';
    const loadAll = searchParams.get('loadAll') === 'true'; // Explicit flag to load all orders

    // If loadAll is true, use the old behavior (for backward compatibility)
    if (loadAll) {
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
      query += ' ORDER BY order_time ASC LIMIT 1000'; // Add reasonable limit even for loadAll

      const rows = await executeQuery(query) as any[];
      console.log(`[ORDERS API] Fetching ALL orders - includeServed: ${includeServed}, statusFilter: ${statusFilter}`);
      console.log(`[ORDERS API] Found ${rows.length} orders`);

      const orders = rows.map(row => {
        let itemsData = row.items;
        if (typeof row.items === 'string') {
          try {
            itemsData = JSON.parse(row.items);
          } catch (parseError) {
            console.warn('Failed to parse items JSON:', row.items);
            itemsData = [];
          }
        }
        return { ...row, items: itemsData };
      });

      return NextResponse.json(orders);
    }

    // Default: Use pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50'))); // Max 100 per page
    const offset = (page - 1) * limit;

    let whereClauses = [];
    const params: any[] = [];

    if (!includeServed) {
        whereClauses.push("status != 'served'");
    }

    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (statusFilter) {
        const statuses = statusFilter.split(',').filter(status => validStatuses.includes(status.trim()));
        if (statuses.length > 0) {
            whereClauses.push(`status IN ('${statuses.join("', '")}')`);
            // Note: Using string interpolation for IN clause as prepared statements don't support dynamic IN lists well
        }
    }

    let whereClause = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM orders${whereClause}`;
    const countResult = await executeQuery(countQuery) as any[];
    const totalOrders = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated orders
    const ordersQuery = `
      SELECT id, order_number, items, total, status, payment_status, payment_mode, order_time
      FROM orders${whereClause}
      ORDER BY order_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await executeQuery(ordersQuery) as any[];
    console.log(`[ORDERS API] Fetching paginated orders - page: ${page}, limit: ${limit}, statusFilter: ${statusFilter}`);
    console.log(`[ORDERS API] Found ${rows.length} orders (total: ${totalOrders})`);

    const orders = rows.map(row => {
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
        items: itemsData,
        payment_status: row.payment_status || 'pending',
        payment_mode: row.payment_mode || null
      };
    });

    return NextResponse.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
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
