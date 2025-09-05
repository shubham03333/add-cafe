# Sales Revenue Calculation Fix

## Issue Fixed
The sales report was incorrectly calculating revenue based on `status = 'served'` instead of `payment_status = 'paid'`. This caused revenue figures to be lower than actual because orders that were paid but not yet served were not included in the calculations.

## Changes Made

### 1. Sales Report API (`src/app/api/sales-report/route.ts`)
- **Total Revenue Query**: Changed from `status = 'served'` to `payment_status = 'paid'`
- **Daily Breakdown Query**: Changed from `status = 'served'` to `payment_status = 'paid'`

### 2. Daily Sales API (`src/app/api/daily-sales/today/route.ts`)
- **Total Sales Query**: Changed from `status = 'served'` to `payment_status = 'paid'`
- **Payment Mode Breakdown Query**: Changed from `status = 'served'` to `payment_status = 'paid'`

## Business Logic
Revenue should be calculated based on payments received (`payment_status = 'paid'`), not on whether orders have been served (`status = 'served'`). This ensures that all paid orders contribute to revenue figures, regardless of their current processing status.

## Result
The sales report for 9/4/2025 should now show the correct revenue of ₹3200 instead of the incorrect ₹2703.

## Files Modified
- `src/app/api/sales-report/route.ts`
- `src/app/api/daily-sales/today/route.ts`
