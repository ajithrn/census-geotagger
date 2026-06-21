# Census GeoTagger

Offline-first PWA for logging household census visits with GPS geolocation tagging.

**Live:** [cgt.ajithrn.com](https://cgt.ajithrn.com)

## Features

- Multi-step survey form for household data collection
- GPS geolocation capture with accuracy indicator
- Interactive map view with color-coded markers (OpenStreetMap)
- Local-only storage (IndexedDB) — no server, no data leaves device
- Export to CSV, GeoJSON, or PDF report
- Installable PWA with offline support

## Quick Start

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build     # outputs to dist/
npm run preview   # local preview of production build
```

Deployed via GitHub Pages. See [docs/deployment.md](docs/deployment.md) for details.

## Documentation

- [Architecture](docs/architecture.md)
- [Coding Standards](docs/coding-standards.md)
- [Deployment](docs/deployment.md)
- [Changelog](docs/changelog.md)

## Tech Stack

React · TypeScript · Vite · Tailwind CSS · Leaflet · Dexie.js · Lucide Icons · jsPDF

## License

MIT
