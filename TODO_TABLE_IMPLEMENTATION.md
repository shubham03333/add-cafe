# Table Implementation TODO

## Completed ✅
- [x] Add Table interface to types/index.ts
- [x] Create TableSelection component (src/components/TableSelection.tsx)

## In Progress 🔄
- [ ] Modify CustomerOrderSystem to integrate table selection flow
  - [ ] Add Table import
  - [ ] Add table selection state variables (currentStep, selectedOrderType, selectedTable)
  - [ ] Modify order type selection to show table selection for DINE_IN
  - [ ] Update order placement to include table_id for dine-in orders
  - [ ] Add conditional rendering for different steps

## Pending ⏳
- [ ] Update CafeOrderSystem to show table information for orders
- [ ] Test the complete table selection flow
- [ ] Handle edge cases (no tables available, table selection errors)

## Implementation Details

### Customer Flow:
1. Customer selects order type (DINE_IN, TAKEAWAY, DELIVERY)
2. If DINE_IN is selected, show table selection screen
3. Customer selects a table
4. Proceed to menu selection
5. When placing order, include table_id in the request

### Admin Flow:
- Show table information in order details
- Display table code/name in order management
- Track table occupancy (future enhancement)

### API Integration:
- Tables API already exists (/api/tables)
- Orders API accepts table_id field
- No additional API changes needed
