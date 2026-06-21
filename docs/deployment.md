# Deployment

## Live URL

**https://cgt.ajithrn.com**

## Hosting

Deployed on **GitHub Pages** with a custom domain.

## Automated Deployment

Every push to `main` triggers the GitHub Actions workflow at `.github/workflows/deploy.yml`:

1. Checks out code
2. Installs dependencies (`npm ci`)
3. Builds production bundle (`npm run build`)
4. Uploads `dist/` as a Pages artifact
5. Deploys to GitHub Pages

## Custom Domain Setup

1. `public/CNAME` file contains `cgt.ajithrn.com`
2. DNS: Add a CNAME record pointing `cgt.ajithrn.com` → `<username>.github.io`
3. In GitHub repo Settings → Pages → Custom domain: `cgt.ajithrn.com`
4. Enable "Enforce HTTPS"

## Manual Deployment

```bash
npm run build
# Upload contents of dist/ to any static host
```

The `dist/` folder is self-contained — works on any static file server (Nginx, Apache, Netlify, Vercel, S3, etc.)

## Environment

No environment variables required. The app is fully client-side with no API keys.

## Build Output

```
dist/
├── index.html
├── manifest.webmanifest
├── sw.js
├── workbox-*.js
├── CNAME
├── favicon.svg
├── pwa-192x192.svg
├── pwa-512x512.svg
├── og-image.svg
├── assets/
│   ├── bmc-logo-no-background.png
│   ├── index-*.css    (~38 KB, gzip: ~12 KB)
│   └── index-*.js     (~1.1 MB, gzip: ~335 KB)
└── (service worker precache files)
```

## PWA Behavior

- Service Worker uses **prompt-based updates** — user is notified and chooses when to update
- Update banner appears when a new version is detected (checked every 60 min)
- Install prompt shown after 30s delay (deferred to avoid interrupting first use)
- Offline indicator (amber bar) appears when network is lost
- OSM map tiles are cached (CacheFirst, 30-day expiry, max 500 tiles)
- App shell is precached for offline access
- Users can install to home screen on mobile
- `clientsClaim: true` ensures new SW takes control after activation

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Old version showing | Hard refresh (Ctrl+Shift+R) or clear site data |
| PWA not installing | Ensure HTTPS, check manifest in DevTools → Application |
| Map tiles not loading offline | Visit the area online first to cache tiles |
| Custom domain not working | Verify CNAME DNS propagation, check GitHub Pages settings |
