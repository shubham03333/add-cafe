import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - List all customers
export async function GET() {
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const [customers] = await db.execute(`
      SELECT id, name, mobile, created_at, updated_at
      FROM customers
      ORDER BY created_at DESC
    `);
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { name, mobile, password } = await request.json();

    if (!name || !mobile || !password) {
      return NextResponse.json(
        { error: 'Name, mobile, and password are required' },
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

    // Check if mobile already exists
    const [existingCustomers] = await db.execute(
      'SELECT id FROM customers WHERE mobile = ?',
      [mobile]
    );

    if ((existingCustomers as any[]).length > 0) {
      return NextResponse.json({ error: 'Mobile number already exists' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert the new customer
    const [result] = await db.execute(
      'INSERT INTO customers (name, mobile, password) VALUES (?, ?, ?)',
      [name, mobile, hashedPassword]
    );

    const insertResult = result as any;

    // Get the created customer
    const [newCustomer] = await db.execute(
      'SELECT id, name, mobile, created_at, updated_at FROM customers WHERE id = ?',
      [insertResult.insertId]
    );

    return NextResponse.json((newCustomer as any[])[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
