# Architecture

## Overview

Census GeoTagger is a client-side Progressive Web App with zero backend dependencies. All data stays on the user's device.

```
┌─────────────────────────────────────────────┐
│               Census GeoTagger              │
├─────────────────────────────────────────────┤
│  UI Layer (React + Tailwind CSS)            │
│  ┌──────────┬─────────┬─────────┬────────┐ │
│  │  Survey  │   Map   │ Records │ Export │ │
│  │  Form    │  View   │  List   │ Panel  │ │
│  └──────────┴─────────┴─────────┴────────┘ │
├─────────────────────────────────────────────┤
│  Data Layer (Dexie.js → IndexedDB)          │
├─────────────────────────────────────────────┤
│  Services                                   │
│  ┌──────────────┬────────────┬───────────┐ │
│  │ Geolocation  │  Leaflet   │  Export   │ │
│  │ API          │  + OSM     │  Utils    │ │
│  └──────────────┴────────────┴───────────┘ │
├─────────────────────────────────────────────┤
│  PWA Shell (Service Worker + Workbox)       │
└─────────────────────────────────────────────┘
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

## Directory Structure

```
src/
├── components/       # React UI components
│   ├── SurveyForm.tsx    # Multi-step survey wizard
│   ├── MapView.tsx       # Leaflet map with markers
│   ├── RecordsList.tsx   # Searchable records list
│   └── ExportPanel.tsx   # Export options + stats
├── db/
│   └── database.ts       # Dexie.js schema and CRUD helpers
├── hooks/
│   └── useGeolocation.ts # Browser Geolocation API wrapper
├── types/
│   └── survey.ts         # TypeScript types, labels, constants
├── utils/
│   ├── exportCsv.ts      # CSV and GeoJSON generation
│   └── exportPdf.ts      # PDF report generation
├── App.tsx               # Root component with tab navigation
├── main.tsx              # Entry point
└── index.css             # Tailwind imports + custom styles
```

## Data Flow

1. **Survey Form** → User fills form → GPS captured → Data saved to IndexedDB
2. **Map View** → Reads all visits from IndexedDB → Renders Leaflet markers
3. **Records** → Reads from IndexedDB → Displays searchable list
4. **Export** → Reads from IndexedDB → Generates CSV/GeoJSON/PDF → Browser download

## Database Schema

Primary table: `visits`

| Field | Type | Indexed |
|-------|------|---------|
| id | string (UUID) | Primary Key |
| householdId | string | Yes |
| createdAt | number (timestamp) | Yes |
| visitStatus | string | Yes |
| surveyorName | string | Yes |
| ward | string | Yes |
| geoLocation | object | No |
| (30+ other fields) | various | No |

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | React 19 | Component model, ecosystem, TypeScript support |
| Build | Vite | Fast HMR, native ESM, PWA plugin |
| Styling | Tailwind CSS 4 | Utility-first, no runtime, small bundle |
| Icons | Lucide React | Clean SVG icons, tree-shakeable |
| Map | Leaflet + react-leaflet | Mature, lightweight, OSM integration |
| Tiles | OpenStreetMap | Free, no API key, community-maintained |
| Storage | Dexie.js (IndexedDB) | Typed, promise-based, large storage quota |
| PDF | jsPDF + html2canvas | Client-side generation, no server needed |
| CSV | PapaParse | Robust CSV generation with proper escaping |
| PWA | vite-plugin-pwa | Auto service worker generation, Workbox |
