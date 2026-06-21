# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-06-21

### Added

- Multi-step survey form (6 steps: Location, Household, Housing, Economy, Health, Review)
- GPS geolocation capture with accuracy display
- Interactive map view using Leaflet + OpenStreetMap
- Color-coded markers by visit status (completed/partial/revisit)
- Filter markers by status on map
- Searchable records list with expandable details
- Export to CSV (spreadsheet-compatible)
- Export to GeoJSON (GIS-compatible)
- Export to PDF (full report with map, legend, stats, and details)
- PWA support with prompt-based update notifications
- Install prompt with deferred display (30s delay)
- Offline indicator banner
- Service Worker caches OSM tiles for offline map use
- IndexedDB storage via Dexie.js (all data local)
- Lucide React icons throughout
- Accessible UI: ARIA labels, keyboard navigation, proper contrast ratios
- Dangerous delete action with type-to-confirm modal
- Credits section with Buy Me a Coffee and contact links
- About modal with app info and developer details
- GitHub Pages deployment with custom domain (cgt.ajithrn.com)
- SEO meta tags, Open Graph, and Twitter Card support

### Technical

- React 19 + TypeScript
- Vite 8 with PWA plugin (prompt mode, manual SW registration)
- Tailwind CSS 4
- Dexie.js 4 for IndexedDB
- Leaflet + react-leaflet for mapping
- jsPDF + html2canvas for PDF generation
- PapaParse for CSV export
- Lucide React for icons
- GitHub Actions CI/CD pipeline
