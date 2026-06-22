# Architecture

## Overview

Census GeoTagger is a client-side Progressive Web App with zero backend dependencies. All data stays on the user's device.

```
┌──────────────────────────────────────────────────────┐
│                  Census GeoTagger                     │
├──────────────────────────────────────────────────────┤
│  UI Layer (React + Tailwind CSS)                     │
│  ┌────────┬───────┬─────────┬────────┬───────┐      │
│  │ Survey │  Map  │ Records │ Export │ About │      │
│  │ (edit) │(pins) │ (full)  │(PDF/CSV│(legal)│      │
│  └────────┴───────┴─────────┴────────┴───────┘      │
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

- Single `renderMapImage()` function used by both PDF and standalone image export
- Creates a hidden 1800x1800px off-screen Leaflet map with compact 20px numbered pins
- Screenshots at 3x scale → 5400x5400px square image (always hi-res, regardless of device)
- Uses fitBounds with 200px padding and maxZoom 18 for tight framing
- Only offsets markers at truly identical GPS coordinates (<1m apart) by ~5m
- Does not depend on current tab, visible map, or saved zoom level

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
│   ├── ExportPanel.tsx   # CSV, GeoJSON, PDF export + stats
│   ├── AboutPage.tsx     # Privacy, disclaimer, terms, credits
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
│   └── exportPdf.ts      # PDF: hidden map render, stats dashboard, details
├── App.tsx               # Root: 5-tab nav, desktop frame, edit routing
├── main.tsx              # Entry point
└── index.css             # Tailwind + custom styles
```

## Data Flow

1. **Survey Form** → User fills stepped form → GPS captured → Saved to IndexedDB
2. **Edit** → Record loaded into form → Updated via put() → Navigate to Records
3. **Map View** → Reads all visits → Renders numbered Leaflet markers (with overlap offset)
4. **Records** → Reads from IndexedDB → Full data expand → Edit/Delete actions
4. **Export PDF** → Renders hidden map (1800px @3x) → Generates multi-page report
5. **Export Map Image** → Same renderMapImage() → Downloads as PNG
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
| PDF | jsPDF + html2canvas + Leaflet | Client-side hidden map render + report generation |
| CSV | PapaParse | Robust CSV generation with proper escaping |
| PWA | vite-plugin-pwa (prompt mode) | Manual SW registration, user-controlled updates |

## Desktop vs Mobile

- Mobile: full-screen app, 5-tab bottom nav
- Desktop (md+): constrained to 420px mobile frame with gray background + footer links
- Same codebase, responsive via Tailwind breakpoints
