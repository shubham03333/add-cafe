# Table Occupancy Implementation

## Completed Tasks
- [x] Update Table interface to include `is_occupied` field
- [x] Modify `/api/tables` route to check for active orders and determine occupancy
- [x] Update TableSelection component to show occupied tables in red and prevent selection
- [x] Add auto-refresh functionality every 60 seconds to keep table status updated

## Followup Steps
- [ ] Test the table selection functionality to ensure occupied tables are properly indicated and non-selectable
- [ ] Verify that tables become available again after orders are served or cancelled
- [ ] Verify auto-refresh works correctly and updates table status in real-time

## New Feature: Table Filter Dropdown in Order Queue
- [ ] Add a small dropdown next to "Order Queue" text for filtering orders by table
- [ ] Implement table selection state and filtering logic
- [ ] Fetch tables list for dropdown options
- [ ] Update order display to show only pending orders for selected table
- [ ] Ensure UI remains user-friendly with proper styling and responsiveness
