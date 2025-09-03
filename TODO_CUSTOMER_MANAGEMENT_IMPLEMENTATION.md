# Customer Management Implementation

## Overview
Add customer management functionality under User Management in the admin control panel.

## Tasks
- [x] Create `/api/customers/route.ts` - GET (list customers), POST (create customer)
- [x] Create `/api/customers/[id]/route.ts` - PUT (update customer), DELETE (delete customer)
- [ ] Modify `UserManagement.tsx` to include tabs for Staff Users and Customers
- [ ] Add customer CRUD functionality in UserManagement component
- [ ] Test customer management functionality
- [ ] Verify mobile number uniqueness validation
- [ ] Ensure proper error handling and user feedback

## Files to Create
- `src/app/api/customers/route.ts`
- `src/app/api/customers/[id]/route.ts`

## Files to Edit
- `src/components/UserManagement.tsx`

## Dependencies
- Customers table already exists in database
- Customer interface defined in `src/types/index.ts`
- Database connection via `src/lib/db.ts`
