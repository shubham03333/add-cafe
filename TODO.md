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
