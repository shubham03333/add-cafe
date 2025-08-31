# Payment Integration with Google Pay

## Tasks
- [x] Add Google Pay script to layout.tsx
- [x] Update Order interface in types/index.ts to include payment_status
- [x] Modify CustomerOrderSystem.tsx to show Pay button after order placement
- [x] Implement Google Pay payment logic in CustomerOrderSystem.tsx
- [x] Update orders API to handle payment status updates
- [ ] Test payment flow

## Details
- Add Google Pay JavaScript SDK to layout
- Show Pay button when order is placed and payment_status is 'pending'
- Handle payment success/failure
- Update order payment status via API
- Created new API endpoint: POST /api/orders/[id]/pay
- Updated order creation to include payment_status field
- Updated order update API to handle payment_status changes
