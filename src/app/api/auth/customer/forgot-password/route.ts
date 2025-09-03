import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { mobile } = await request.json();

  if (!mobile) {
    return NextResponse.json(
      { error: 'Mobile number is required' },
      { status: 400 }
    );
  }

  try {
    // Return contact information for password reset
    return NextResponse.json({
      message: 'Please contact Adda Cafe directly for password reset assistance.',
      contact_info: {
        phone: '+91-7558379410',
        whatsapp: '+91-7558379410',
        email: 'support@addacafe.com'
      },
      instructions: 'Call or WhatsApp us with your registered mobile number and we will help you reset your password.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
