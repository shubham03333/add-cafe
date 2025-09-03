import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// PUT - Update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { name, mobile, password } = await request.json();
    const { id } = await params;

    if (!name || !mobile) {
      return NextResponse.json(
        { error: 'Name and mobile are required' },
        { status: 400 }
      );
    }

    // Validate mobile number format (basic validation)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return NextResponse.json(
        { error: 'Invalid mobile number format' },
        { status: 400 }
      );
    }

    // Check if mobile already exists (excluding current customer)
    const [existingCustomers] = await db.execute(
      'SELECT id FROM customers WHERE mobile = ? AND id != ?',
      [mobile, id]
    );

    if ((existingCustomers as any[]).length > 0) {
      return NextResponse.json({ error: 'Mobile number already exists' }, { status: 409 });
    }

    let updateQuery = 'UPDATE customers SET name = ?, mobile = ?';
    let queryParams: any[] = [name, mobile];

    // Only update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    await db.execute(updateQuery, queryParams);

    // Get the updated customer
    const [updatedCustomer] = await db.execute(
      'SELECT id, name, mobile, created_at, updated_at FROM customers WHERE id = ?',
      [id]
    );

    return NextResponse.json((updatedCustomer as any[])[0]);
  } catch (error) {
    console.error('Failed to update customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    await db.execute('DELETE FROM customers WHERE id = ?', [id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
