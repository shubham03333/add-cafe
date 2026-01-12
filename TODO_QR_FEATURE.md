# Google Review QR Code Feature Implementation

## Steps to Complete

- [ ] Install qrcode.react dependency
- [ ] Create GoogleReviewQR.jsx component
- [ ] Integrate QR component into bill preview (CafeOrderSystem.tsx)
- [ ] Add print compatibility handling (canvas to base64 conversion)
- [ ] Update print CSS for QR visibility
- [ ] Test QR generation and printing

## Implementation Details

1. **Install dependency**: npm install qrcode.react
2. **Create component**: components/GoogleReviewQR.jsx
   - Render QR code using fixed Google review URL
   - Accept optional size prop
   - Show label text below QR
3. **Integrate into bill preview**:
   - Import GoogleReviewQR in CafeOrderSystem.tsx
   - Add below the total amount in print-bill-content
   - Ensure it's inside printable DOM area
4. **Print compatibility**:
   - Before window.print(), convert canvas to base64 PNG
   - Replace canvas with img tag
   - Handle in print button click handler
5. **Print CSS requirements**:
   - Ensure QR is visible in print media
   - canvas and img elements are visible
   - Clean rendering on thermal printer

## Acceptance Criteria
- QR appears on screen before printing
- QR prints clearly on thermal printer
- QR opens Google review page when scanned
- No backend dependency
- Works on mobile browser + printer app
