import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  const { mobile, password } = await request.json();

  if (!mobile || !password) {
    return NextResponse.json(
      { error: 'Mobile and password are required' },
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
    // Find customer by mobile
    const [customers] = await db.execute(
      'SELECT id, name, mobile, password, created_at, updated_at FROM customers WHERE mobile = ?',
      [mobile]
    );

    const customer = (customers as any[])[0];

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, customer.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { customerId: customer.id, mobile: customer.mobile },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return customer info (excluding password)
    const { password: _, ...customerWithoutPassword } = customer;
    return NextResponse.json({
      customer: customerWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
