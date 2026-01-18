# TODO: Animated Sidebar for Table Management

## Overview
Implement an animated sidebar for table management in the ADDA café POS system with smooth animations, table selection, and order state management.

## Requirements Breakdown

### 1. Sidebar Structure & Animation
- [x] Create sliding sidebar (320px wide, full height, white background, shadow)
- [x] Add smooth animation (translate-x-0 open, -translate-x-full closed, 300ms ease-in-out, z-50)
- [x] Add dark overlay (bg-black bg-opacity-50, z-40) that closes sidebar on click

### 2. Sidebar Header
- [x] Red gradient background (from-red-600 to-red-700)
- [x] "Tables & Orders" title
- [x] Close button (X icon from lucide-react) on right

### 3. Takeaway Section
- [x] Full-width green gradient button (from-green-500 to-green-600)
- [x] "Takeaway Order" text with Package icon
- [x] Border-bottom separator
- [x] On click: set selectedTable to { id: 'TAKEAWAY', name: 'Takeaway', capacity: 0 }, clear cart, close sidebar

### 4. Table Grid & Cards
- [x] 2-column grid (grid-cols-2) with gap-3 in scrollable area
- [x] Table data: const tables = [{ id: 'T1', name: 'Table 1', capacity: 2 }, ...]
- [x] Table cards: name, capacity with Users icon, visual status
- [x] Available: white bg, gray border, hover scale-105, blue border on hover
- [x] Selected: blue bg (bg-blue-100), blue border (border-blue-500), shadow
- [x] Occupied: red bg (bg-red-100), red border, disabled, pulsing red dot, "X items in queue"

### 5. State Management
- [x] Add states: sidebarOpen, selectedTable, orders (object { tableId: [items array] })
- [x] Add isTableOccupied function: (tableId) => orders[tableId] && orders[tableId].length > 0

### 6. Table Selection Logic
- [x] Tables only selectable if NOT occupied
- [x] On select: set selectedTable, clear cart, close sidebar
- [x] Occupied tables: cursor-not-allowed, visual feedback

### 7. Menu Toggle Button
- [x] Add Menu icon button in main header
- [x] Styling: bg-white/20 hover:bg-white/30, rounded-xl, p-3
- [x] On click: setSidebarOpen(true)

### 8. Order Placement
- [x] Modify placeOrder: setOrders({ ...orders, [selectedTable.id]: [...(orders[selectedTable.id] || []), ...cart] })
- [x] Clear cart and show success message

### 9. Cart Integration
- [x] Show selected table name and capacity in cart header ("Table Name (X seats)" or "Takeaway")
- [x] Show "Select Table" when no table selected
- [x] Disable "Add to Cart" buttons when no table selected (opacity-50, cursor-not-allowed)

### 10. Sidebar Behavior
- [x] Close on: X button, overlay click, table select, takeaway click
- [x] Tables only selectable if not occupied
- [x] Takeaway doesn't associate with table
- [x] Cart clears when switching tables
- [x] Orders persist in state

### 11. Styling & Icons
- [x] Use Tailwind CSS exclusively
- [x] Import icons: Menu, X, Users, Package, ShoppingCart, Clock, DollarSign from lucide-react
- [x] Red theme (#DC2626 / red-600) for main elements
- [x] Green (green-500/600) for positive actions
- [x] Smooth transitions and hover states on interactive elements

## Implementation Steps

1. [ ] Add new state variables and imports
2. [ ] Create sidebar JSX structure with animations
3. [ ] Implement table grid and card components
4. [ ] Add menu toggle button to header
5. [ ] Update cart section with table display
6. [ ] Modify addToOrder to check table selection
7. [ ] Update placeOrder logic for new orders state
8. [ ] Add overlay click handler
9. [ ] Test all interactions and animations
10. [ ] Verify responsive behavior and styling

## Files to Modify
- [ ] src/components/CafeOrderSystem.tsx (main implementation)

## Testing Checklist
- [ ] Sidebar opens/closes smoothly
- [ ] Table selection works correctly
- [ ] Takeaway selection works
- [ ] Cart disabled when no table selected
- [ ] Orders persist correctly
- [ ] Occupied tables show proper status
- [ ] All animations and transitions work
- [ ] Responsive design maintained
