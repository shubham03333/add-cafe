# PWA Android Installability Fix

## Issues Identified
- Manifest.json has inadequate icons (same image for different sizes, improper purpose)
- Layout.tsx has duplicate meta tags (manifest and theme-color in both metadata and head)
- No visible service worker (likely because not built yet)
- PWA disabled in development mode in next.config.ts

## Plan
- [ ] Update manifest.json with proper icons and purpose
- [ ] Clean up layout.tsx to remove duplicate meta tags
- [ ] Ensure proper MIME type for manifest.json
- [ ] Build the app to generate service worker
- [ ] Test PWA installability on Android
- [ ] Add instructions for HTTPS requirement in production

## Dependent Files
- public/manifest.json
- src/app/layout.tsx
- next.config.ts (if needed)

## Followup Steps
- Build the app: npm run build
- Start production server: npm run start
- Test on Android device/browser
- Ensure HTTPS in production deployment
