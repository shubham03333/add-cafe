# WhatsApp OTP Implementation for Forgot Password

## Current Status
- Issue: OTP is not being sent to customers' phones during forgot password
- Root Cause: forgot-password API has placeholder TODO comments, no actual implementation

## Implementation Plan

### ✅ Step 1: Add Twilio WhatsApp Dependency
- [x] Install twilio package
- [x] Update package.json

### ✅ Step 2: Create OTP Database Table
- [x] Create customer_otps table with fields: id, customer_id, otp_code, expires_at, created_at
- [x] Add SQL script for table creation
- [x] Update database schema

### ✅ Step 3: Create WhatsApp Utility Function
- [x] Create src/lib/whatsapp.ts utility
- [x] Implement sendOTP function using Twilio WhatsApp API
- [x] Add error handling and fallback logging

### ✅ Step 4: Update Forgot Password API
- [x] Generate 6-digit OTP
- [x] Store OTP in database with 10-minute expiry
- [x] Send OTP via WhatsApp
- [x] Return appropriate response

### ✅ Step 5: Environment Variables Setup
- [x] Add Twilio credentials to .env.example
- [x] Document required environment variables
- [x] Add WhatsApp number configuration

### ✅ Step 6: Testing & Verification
- [ ] Test OTP generation and storage
- [ ] Test WhatsApp sending (with fallback)
- [ ] Verify end-to-end forgot password flow
- [ ] Handle edge cases (invalid mobile, expired OTP, etc.)

## Dependencies
- Twilio WhatsApp API (requires Twilio account and WhatsApp Business approval)
- Database table for OTP storage
- Environment variables for Twilio credentials

## Notes
- OTP expiry: 10 minutes
- OTP format: 6-digit numeric
- Fallback: Console logging if WhatsApp fails
- Mobile format: Indian format (+91XXXXXXXXXX)
