# TODO: Print Size Optimization

## Objective
Reduce the print size from 2 MB to a minimal size by making CSS lightweight and optimizing print-specific styles.

## Current Status
- [x] Identified that 2MB print size is caused by entire Tailwind CSS bundle being included in print
- [x] Created minimal print.css with only essential print styles
- [x] Fixed CSS parsing errors by using attribute selectors instead of escaped class names
- [x] Changed image source from /adda.png to /logo.png and reduced print dimensions
- [x] Imported print.css in layout.tsx
- [x] Started dev server for testing

## Remaining Tasks
- [x] Test print functionality to verify size reduction
- [x] Remove unnecessary print classes from CafeOrderSystem.tsx if any
- [x] Fix bill content visibility issue in print preview
- [ ] Optimize image compression if needed
- [ ] Verify that only bill content is printed (no extra CSS)

## Implementation Details
- Created src/app/print.css with minimal print styles
- Modified CafeOrderSystem.tsx to use smaller logo and print dimensions
- Added print.css import to layout.tsx

## Expected Outcome
- Print size reduced from 2MB to under 100KB
- Clean, minimal bill printing for thermal printers
- Faster print loading and processing

## Testing Instructions
1. Open the application in browser (dev server is running)
2. Click on an order to open the bill popup
3. Click the "🖨️ Print" button
4. Check print preview - should show only the bill content with minimal CSS
5. Verify print size is significantly reduced from 2MB
