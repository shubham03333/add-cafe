# Customer Authentication Implementation TODO

## Database Schema
- [x] Update `scripts/init-database.sql` to add customers table with name, mobile, password fields
- [x] Add mobile number validation and unique constraint

## Type Definitions
- [x] Add Customer interface and related types to `src/types/index.ts`
- [ ] Update Order interface to include customer_id

## Authentication System
- [x] Create customer authentication context (`src/contexts/CustomerAuthContext.tsx`)
- [x] Implement JWT token handling for customer sessions
- [ ] Add authentication guards and redirects

## API Endpoints
- [x] Create `/api/auth/customer/signup` endpoint with mobile validation
- [x] Create `/api/auth/customer/login` endpoint with JWT token generation
- [x] Create `/api/auth/customer/forgot-password` endpoint (placeholder for OTP)

## UI Components
- [x] Create customer login page component (`src/app/customer/login/page.tsx`)
- [x] Create customer signup page component (`src/app/customer/signup/page.tsx`)
- [x] Add forgot password functionality to login page

## Integration
- [ ] Modify `src/app/customer/page.tsx` to check authentication status
- [ ] Update `src/components/CustomerOrderSystem.tsx` to use authenticated customer data
- [ ] Add logout functionality to customer interface

## Testing
- [ ] Test complete authentication flow (signup -> login -> order -> logout)
- [ ] Verify mobile number validation
- [ ] Test session persistence across page refreshes
