import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { is_active } = await request.json();

    // Validation
    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    // Check if table exists
    const existingTable = await executeQuery(
      'SELECT id FROM tables_master WHERE id = ?',
      [id]
    ) as any[];

    if (existingTable.length === 0) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Update table status
    await executeQuery(
      'UPDATE tables_master SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    return NextResponse.json({
      message: 'Table status updated successfully',
      is_active
    });
  } catch (error) {
    console.error('Error updating table status:', error);
    return NextResponse.json(
      { error: 'Failed to update table status' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await executeQuery(
      'SELECT id, table_code, table_name, capacity, is_active FROM tables_master WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if table exists
    const existingTable = await executeQuery(
      'SELECT id FROM tables_master WHERE id = ?',
      [id]
    ) as any[];

    if (existingTable.length === 0) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Check if table has active orders
    const activeOrders = await executeQuery(
      'SELECT id FROM orders WHERE table_id = ? AND status NOT IN ("served", "cancelled")',
      [id]
    ) as any[];

    if (activeOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete table with active orders. Please complete or cancel all orders for this table first.' },
        { status: 400 }
      );
    }

    // Hard delete the table
    await executeQuery(
      'DELETE FROM tables_master WHERE id = ?',
      [id]
    );

    return NextResponse.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}
