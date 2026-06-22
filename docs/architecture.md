# Architecture

## Overview

Census GeoTagger is a client-side Progressive Web App with zero backend dependencies. All data stays on the user's device.

```
┌──────────────────────────────────────────────────────┐
│                  Census GeoTagger                     │
├──────────────────────────────────────────────────────┤
│  UI Layer (React + Tailwind CSS)                     │
│  ┌────────┬───────┬─────────┬────────┬───────┐      │
│  │ Survey │  Map  │ Records │ Export │ More  │      │
│  │ (edit) │(pins) │ (full)  │(PDF/CSV│(popup)│      │
│  └────────┴───────┴─────────┴────────┴───────┘      │
│  Sub-pages: Profile | Settings | About               │
├──────────────────────────────────────────────────────┤
│  Data Layer (Dexie.js → IndexedDB)                   │
├──────────────────────────────────────────────────────┤
│  Services                                            │
│  ┌──────────────┬────────────────┬────────────────┐  │
│  │ Geolocation  │ Leaflet + OSM  │ Export Utils   │  │
│  │ API          │ (numbered pins)│ (PDF renderer) │  │
│  └──────────────┴────────────────┴────────────────┘  │
├──────────────────────────────────────────────────────┤
│  PWA Shell (Service Worker + Workbox)                │
│  (prompt update, install prompt, offline indicator)   │
└──────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Offline-First

- All data is stored in IndexedDB via Dexie.js
- Service Worker caches the app shell and OpenStreetMap tiles
- No network requests required after initial load (except for map tiles on new areas)
- Offline indicator shown to user when network is lost
- PWA update prompt notifies user of new versions without forcing reload

### No Backend

- Eliminates hosting costs, auth complexity, and data privacy concerns
- Users own their data completely
- Export mechanisms (CSV, GeoJSON, PDF) allow data transfer when needed

### PWA over Native App

- Single codebase for all platforms
- No app store approval process
- Instant updates via service worker
- Installable on home screen

### PDF Map Rendering

- Single `renderMapToCanvas()` function in `mapRenderer.ts` used by both PDF and standalone image export
- Uses OffscreenCanvas when available (prevents Chrome compositor from evicting backing store on mobile)
- Concurrent tile fetching via worker-pool pattern:
  - Desktop: fetches all tiles in parallel (8 concurrent), then draws to canvas
  - Mobile: fetches row-by-row (4 concurrent per row), draws each row immediately, releases images for GC
- Checks SW cache first (tiles already loaded by map view), falls back to network with retries
- Canvas size automatically clamped to device-safe limits (iOS 4096px, Android 5792px, Desktop 8192px)
- Draws numbered pin markers programmatically using canvas arc/fill
- Overlapping pins rotate their legs outward with progressive length
- Auto-calculates zoom level to fit all pins with padding
- Export uses Blob pipeline (toBlob) instead of toDataURL to reduce memory pressure
- PDF embeds map as JPEG (0.85 quality) for faster jsPDF addImage processing
- No Leaflet, no html2canvas, no hidden DOM — pure canvas + fetch
- Canvas size: 1024px mobile / 1800px desktop (PDF), 1024px mobile / 3600px desktop (image)
- Falls back to regular HTMLCanvasElement on browsers without OffscreenCanvas

### Edit Flow

- Records list shows all entries with full data on expand
- Edit button loads the record into the Survey form (pre-filled)
- Save performs an upsert (put) — overwrites existing record by ID
- After save/update, auto-navigates to Records tab

## Directory Structure

```
src/
├── components/
│   ├── SurveyForm.tsx    # Multi-step wizard (create + edit)
│   ├── MapView.tsx       # Leaflet map with numbered pins
│   ├── RecordsList.tsx   # Searchable list, full expand, edit/delete
│   ├── ExportPanel.tsx   # CSV, GeoJSON, PDF, map image export
│   ├── ProfilePage.tsx   # Surveyor defaults (name, ward, org)
│   ├── SettingsPage.tsx  # Backup, import, data management
│   ├── AboutPage.tsx     # Privacy, disclaimer, terms, credits
│   ├── MorePage.tsx      # Bottom sheet menu (Profile/Settings/About)
│   └── PWAPrompts.tsx    # Floating update/install/offline banners
├── db/
│   └── database.ts       # Dexie.js schema and CRUD (put-based upsert)
├── hooks/
│   ├── useGeolocation.ts # Browser Geolocation API wrapper
│   └── usePWA.ts         # SW registration, update detect, install prompt
├── types/
│   └── survey.ts         # TypeScript types, labels, color constants
├── utils/
│   ├── exportCsv.ts      # CSV and GeoJSON generation
│   ├── exportPdf.ts      # PDF report (uses mapRenderer for map)
│   └── mapRenderer.ts    # Canvas-based OSM tile + pin renderer
├── App.tsx               # Root: 5-tab nav, desktop frame, edit routing
├── main.tsx              # Entry point
└── index.css             # Tailwind + custom styles
```

## Data Flow

1. **Survey Form** → User fills stepped form → GPS captured → Saved to IndexedDB
2. **Edit** → Record loaded into form → Updated via put() → Navigate to Records
3. **Map View** → Reads all visits → Renders numbered Leaflet markers (with overlap offset)
4. **Records** → Reads from IndexedDB → Full data expand → Edit/Delete actions
4. **Export PDF** → Concurrent tile fetch → Pins drawn → JPEG-compressed map embedded in PDF
5. **Export Map Image** → Same renderMapToCanvas() → Downloads as PNG via Blob pipeline
6. **Export CSV/GeoJSON** → Reads from IndexedDB → Generates file → Browser download

## Database Schema

Primary table: `visits` (Dexie.js with `&id` explicit primary key)

| Field | Type | Indexed |
|-------|------|---------|
| id | string (UUID) | Primary Key (&id) |
| householdId | string | Yes |
| createdAt | number (timestamp) | Yes |
| visitStatus | string | Yes |
| surveyorName | string | Yes |
| ward | string | Yes |
| geoLocation | object | No |
| totalMembers | number (auto-calculated) | No |
| (30+ other fields) | various | No |

Write operations use `db.visits.put()` for reliable upsert behavior.

## PDF Report Structure

1. **Cover/Map Page** — Title, metadata, hi-res square map with numbered pins, color legend
2. **Map Index** — Proportional table with pin badges, name, address, type, occupation, status, ward
3. **Statistics Dashboard** — Key metrics boxes, demographics, infrastructure, occupation/type breakdown
4. **Detail Pages** — One per household with pin badge, all fields in sections, notes

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | React 19 | Component model, ecosystem, TypeScript support |
| Build | Vite 8 | Fast HMR, native ESM, PWA plugin |
| Styling | Tailwind CSS 4 | Utility-first, no runtime, small bundle |
| Icons | Lucide React | Clean SVG icons, tree-shakeable |
| Map | Leaflet + react-leaflet | Mature, lightweight, OSM integration |
| Tiles | OpenStreetMap | Free, no API key, community-maintained |
| Storage | Dexie.js 4 (IndexedDB) | Typed, promise-based, large storage quota |
| PDF | jsPDF + canvas tile renderer | Concurrent tile fetch, JPEG compression, pin overlay |
| CSV | PapaParse | Robust CSV generation with proper escaping |
| PWA | vite-plugin-pwa (prompt mode) | Manual SW registration, user-controlled updates |

## Desktop vs Mobile

- Mobile: full-screen app, 5-tab bottom nav
- Desktop (md+): constrained to 420px mobile frame with gray background + footer links
- Same codebase, responsive via Tailwind breakpoints
