import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { mobile } = await request.json();

  if (!mobile) {
    return NextResponse.json(
      { error: 'Mobile number is required' },
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
    // Check if mobile exists
    const [customers] = await db.execute(
      'SELECT id, name FROM customers WHERE mobile = ?',
      [mobile]
    );

    const customer = (customers as any[])[0];

    if (!customer) {
      return NextResponse.json(
        { error: 'Mobile number not found' },
        { status: 404 }
      );
    }

    // TODO: Implement OTP generation and sending via SMS/WhatsApp
    // For now, return success message
    // In production, you would:
    // 1. Generate OTP
    // 2. Store OTP with expiry in database
    // 3. Send OTP via SMS/WhatsApp service
    // 4. Return masked mobile number for confirmation

    return NextResponse.json({
      message: 'OTP sent to your mobile number',
      mobile: mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') // Mask mobile number
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
