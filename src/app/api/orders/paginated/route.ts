import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getTodayDateString } from '@/lib/timezone-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const status = searchParams.get('status') || '';

    // Validate and sanitize sortBy parameter
    const allowedSortColumns = ['order_number', 'total', 'order_time', 'status'];
    const sortBy = allowedSortColumns.includes(searchParams.get('sortBy') || '') ? searchParams.get('sortBy') : 'order_time';

    // Validate sortOrder parameter
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    console.log('🔍 API Debug: Received request with params:', { page, limit, status, sortBy, sortOrder });

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];

    const todayFilter = searchParams.get('today') === 'true';

    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    if (todayFilter) {
      const today = await getTodayDateString();
      if (whereClause) {
        whereClause += ' AND DATE(order_time) = ?';
      } else {
        whereClause = 'WHERE DATE(order_time) = ?';
      }
      params.push(today);
    }

    // Get total count first
    let totalOrders = 0;
    try {
      if (params.length > 0) {
        const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
        const countResult = await executeQuery(countQuery, params) as any[];
        totalOrders = countResult[0]?.total || 0;
      } else {
        const countQuery = `SELECT COUNT(*) as total FROM orders`;
        const countResult = await executeQuery(countQuery) as any[];
        totalOrders = countResult[0]?.total || 0;
      }
    } catch (countError) {
      console.error('🔍 Error in count query:', countError);
      // Continue with 0 total orders
    }

    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated orders - try with string interpolation instead of parameters
    let orders: any[] = [];
    try {
      let ordersQuery = '';

      if (params.length > 0) {
        ordersQuery = `
          SELECT
            id,
            order_number,
            items,
            total,
            status,
            payment_status,
            payment_mode,
            order_time
          FROM orders
          ${whereClause}
          ORDER BY ${sortBy} ${sortOrder}
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        ordersQuery = `
          SELECT
            id,
            order_number,
            items,
            total,
            status,
            payment_status,
            payment_mode,
            order_time
          FROM orders
          ORDER BY ${sortBy} ${sortOrder}
          LIMIT ${limit} OFFSET ${offset}
        `;
      }

      console.log('🔍 Orders query:', ordersQuery);

      const queryResult = await executeQuery(ordersQuery, params.length > 0 ? params : undefined);
      orders = Array.isArray(queryResult) ? queryResult : [];

      console.log('🔍 Orders retrieved:', orders.length);

    } catch (ordersError) {
      console.error('🔍 Error in orders query:', ordersError);
      // Return empty orders array instead of throwing
      orders = [];
    }

    // Parse items JSON for each order
    const processedOrders = orders.map(order => {
      let parsedItems = order.items;
      if (typeof order.items === 'string') {
        try {
          parsedItems = JSON.parse(order.items);
        } catch (error) {
          console.error(`Error parsing items JSON for order ${order.id}:`, error);
          parsedItems = [];
        }
      }
      return {
        ...order,
        items: parsedItems,
        payment_status: order.payment_status || 'pending',
        payment_mode: order.payment_mode || null
      };
    });

    return NextResponse.json({
      orders: processedOrders,
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
    console.error('Error fetching paginated orders:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
