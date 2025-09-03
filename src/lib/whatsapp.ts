import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || ''; // e.g. 'whatsapp:+14155238886'

const client = twilio(accountSid, authToken);

/**
 * Send OTP message via WhatsApp using Twilio API
 * @param toMobile - recipient mobile number in E.164 format, e.g. +919876543210
 * @param otpCode - 6-digit OTP code string
 */
export async function sendWhatsAppOTP(toMobile: string, otpCode: string): Promise<void> {
  if (!accountSid || !authToken || !whatsappFrom) {
    console.warn('Twilio WhatsApp credentials are not configured. Skipping WhatsApp OTP send.');
    console.log(`Mock OTP to ${toMobile}: ${otpCode}`);
    return;
  }

  try {
    const message = `Your OTP code for Cafe Adda is: ${otpCode}. It is valid for 10 minutes.`;

    await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${toMobile}`,
      body: message,
    });

    console.log(`WhatsApp OTP sent to ${toMobile}`);
  } catch (error) {
    console.error('Failed to send WhatsApp OTP:', error);
    // Fallback: log OTP to console
    console.log(`Fallback OTP to ${toMobile}: ${otpCode}`);
  }
}
