# Twilio WhatsApp Setup Guide

## Required Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## How to Get Twilio Credentials

### 1. Create Twilio Account
- Go to [twilio.com](https://www.twilio.com) and create an account
- Verify your email and phone number

### 2. Get Account SID and Auth Token
- Login to Twilio Console
- Go to Dashboard
- Copy your Account SID and Auth Token

### 3. Enable WhatsApp Sandbox
- In Twilio Console, go to Messaging → Try it out → Try WhatsApp
- Follow the setup wizard to enable WhatsApp sandbox
- Note the WhatsApp number provided (usually starts with +14155238886)

### 4. Production Setup (Optional)
- Apply for WhatsApp Business API approval
- Get your own WhatsApp Business number
- Update TWILIO_WHATSAPP_FROM with your approved number

## Database Setup

Run the SQL script to create the OTP table:

```bash
# Run this in your PlanetScale MySQL database
mysql -h your-host -u your-user -p your-database < scripts/add-customer-otps-table.sql
```

## Testing

1. **Without Twilio credentials**: The system will log OTPs to console
2. **With Twilio credentials**: OTPs will be sent via WhatsApp

## Security Notes

- Never commit `.env.local` to version control
- Keep Twilio credentials secure
- Use environment-specific credentials for production

## Troubleshooting

- **OTP not received**: Check console logs for fallback OTP
- **Twilio errors**: Verify credentials and WhatsApp number
- **Database errors**: Ensure customer_otps table is created
