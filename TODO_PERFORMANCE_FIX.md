# Performance Fix: Cash/Online Button Delay

## Issue
When clicking "cash" or "online" buttons to serve an order, the process was taking time due to failed inventory updates.

## Root Cause
The order serving process calls two APIs:
1. `/api/orders/[id]/pay` - Updates payment mode and status
2. `/api/orders/[id]` (PUT) - Marks order as 'served' and tries to update inventory

The inventory update was failing because the PATCH method didn't exist in `/api/inventory/route.ts`.

## Fix Applied
- Added PATCH method to `src/app/api/inventory/route.ts`
- Handles stock quantity adjustments for multiple items
- Uses database transactions for consistency
- Clears cache after updates
- Prevents negative stock levels

## Testing
- [ ] Test cash payment flow
- [ ] Test online payment flow
- [ ] Verify inventory stock is properly reduced
- [ ] Confirm no delays in payment processing
