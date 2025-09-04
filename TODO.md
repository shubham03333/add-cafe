# TODO: Add "Today" Button to Admin Orders Tab

## Tasks
- [ ] Update `/api/orders/paginated` to support `today=true` query parameter for filtering orders by today's date
- [ ] Modify `OrderManagement.tsx` to add "Today" button and handle today filter state
- [ ] Update `src/app/admin/page.tsx` to pass today filter prop to OrderManagement if needed
- [ ] Test the "Today" button functionality to ensure it lists today's orders in ascending order
- [ ] Verify toggle functionality to return to normal order listing

## Progress
- [x] Plan approved and confirmed
