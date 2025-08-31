import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { UpdateOrderRequest } from '@/types';
import { getTodayDateString } from '@/lib/timezone-dynamic'; // Import dynamic timezone utility
// PUT update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: UpdateOrderRequest = await request.json();
    const { id } = await params;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (body.items) {
      updateFields.push('items = ?');
      values.push(JSON.stringify(body.items));
    }

    if (body.total !== undefined) {
      updateFields.push('total = ?');
      values.push(body.total);
    }

    if (body.status) {
      updateFields.push('status = ?');
      values.push(body.status);
    }

    if (body.payment_status) {
      updateFields.push('payment_status = ?');
      values.push(body.payment_status);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await executeQuery(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    if (body.status === 'served') {
      console.log(`Updating order status for order ID: ${id} to served`);
      // Get the order total first
      const orderRows = await executeQuery(
        'SELECT total FROM orders WHERE id = ?',
        [id]
      ) as any[];
      
      if (orderRows && orderRows.length > 0) {
        const orderTotal = orderRows[0].total;
        console.log(`Order total for order ID ${id}: ₹${orderTotal}`);
        const today = await getTodayDateString(); // Use configured timezone date
        
        await executeQuery(`
          INSERT INTO daily_sales (sale_date, total_orders, total_revenue) 
          VALUES (?, 1, ?) 
          ON DUPLICATE KEY UPDATE 
            total_orders = total_orders + 1,
            total_revenue = total_revenue + ?
        `, [today, orderTotal, orderTotal]);
        console.log(`Updated daily sales for ${today}: +1 order, +₹${orderTotal}`);
      }
    }

    // Reduce stock quantity for each item in the order when status is served
    if (body.status === 'served' && body.items) {
      console.log(`Reducing stock for order ID: ${id}`);
      
      const stockAdjustments = body.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        action: 'subtract'
      }));

      try {
        const inventoryResponse = await fetch('http://localhost:3000/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stockAdjustments)
        });

        if (!inventoryResponse.ok) {
          console.error('Failed to update inventory:', await inventoryResponse.text());
        } else {
          console.log('Stock levels updated successfully');
        }
      } catch (error) {
        console.error('Error updating inventory:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await executeQuery('DELETE FROM orders WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}