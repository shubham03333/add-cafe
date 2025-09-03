import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { name, mobile, password } = await request.json();

  if (!name || !mobile || !password) {
    return NextResponse.json(
      { error: 'Name, mobile, and password are required' },
      { status: 400 }
    );
  }

  // Basic mobile number validation (Indian format example)
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    return NextResponse.json(
      { error: 'Invalid mobile number format' },
      { status: 400 }
    );
  }

  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    // Check if mobile already exists
    const [existingCustomers] = await db.execute(
      'SELECT id FROM customers WHERE mobile = ?',
      [mobile]
    );
    if ((existingCustomers as any[]).length > 0) {
      return NextResponse.json(
        { error: 'Mobile number already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new customer
    const [result] = await db.execute(
      'INSERT INTO customers (name, mobile, password) VALUES (?, ?, ?)',
      [name, mobile, hashedPassword]
    );

    return NextResponse.json({ message: 'Signup successful' }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}
