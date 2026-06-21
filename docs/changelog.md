# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-06-21

### Added

- Numbered pin markers on map (index visible inside pin)
- High-resolution PDF map capture (1800x1800 @ 3x = 5400x5400px square)
- Hidden off-screen map renderer for PDF (no tab-switching needed)
- Statistics dashboard in PDF with key metrics, demographics, infrastructure, occupation breakdown
- Map Index table in PDF with colored pin badges and row separators
- Edit existing survey entry (from Records → Edit button)
- Auto-navigate to Records tab after save/update
- About tab with Privacy Policy, Disclaimer, and Terms of Use
- Desktop mobile-frame layout with footer links
- PWA install prompt with visible contrast (dark icon, heavy shadow, border)
- PWA update banner floats on top with loading spinner
- Offline indicator as floating pill (doesn't shift UI)

### Changed

- Total Members auto-calculated from Males + Females (read-only display)
- Step header redesigned: shows "New Visit" / "Edit Visit" title + step info
- Progress dots smaller and compact with flex connector lines
- Map markers offset slightly when at same GPS coordinates (prevents overlap)
- Markers get increasing z-index so later pins are always clickable
- PDF index table row spacing increased (6mm) with separator lines
- Install prompt delay reduced to 3 seconds
- Credits/legal moved from Export panel to dedicated About tab

### Fixed

- Edit now properly upserts (overwrites existing record, not creates new)
- Step connector lines rendering with gaps (now flex-based)
- Map pin number alignment (flexbox centered)
- PDF index badge number vertical alignment

## [1.1.0] - 2025-06-21

### Added

- Dedicated About tab with Privacy Policy, Disclaimer, and Terms of Use
- Desktop mobile-frame layout with subtle gray background
- Desktop footer with Privacy & GitHub links (fixed to bottom)
- PWA install prompt (3-second deferred display)

### Changed

- Total Members now auto-calculates from Males + Females (read-only display)
- Step progress bar uses flex connectors instead of fixed-width dashes
- Nav bar now has 5 tabs: Survey, Map, Records, Export, About
- Nav icons reduced to 18px for compact 5-tab layout
- Install prompt delay reduced from 30s to 3s
- Moved credits/about/legal content from Export panel to dedicated About tab
- Desktop background simplified (plain gray-100, no pattern)
- Removed AboutModal component (replaced by full About tab)

### Fixed

- Step connector lines rendering as short dashes with gaps
- PWA service worker registration logging improved for dev mode

## [1.0.0] - 2025-06-21

### Added

- Multi-step survey form (6 steps: Location, Household, Housing, Economy, Health, Review)
- GPS geolocation capture with accuracy display
- Auto-calculated total members from male + female inputs
- Interactive map view using Leaflet + OpenStreetMap
- Color-coded markers by visit status (completed/partial/revisit)
- Filter markers by status on map
- Searchable records list with expandable details
- Export to CSV (spreadsheet-compatible)
- Export to GeoJSON (GIS-compatible)
- Export to PDF (full report with map, legend, stats, and details)
- PWA with prompt-based update notifications (user controls when to update)
- Install prompt with 3s deferred display
- Offline indicator banner (amber bar)
- Service Worker with OSM tile caching (30-day, 500 tiles)
- IndexedDB storage via Dexie.js (all data local, no server)
- Dedicated About tab with Privacy, Disclaimer, Terms of Use
- Type-to-confirm delete modal (danger zone)
- Developer credits with Buy Me a Coffee and contact
- Desktop view: mobile-frame layout with footer links
- Responsive step progress bar with flex connectors
- Lucide React icons throughout
- Accessible UI: ARIA labels, role attributes, proper contrast ratios
- SEO meta tags, Open Graph, and Twitter Card support
- GitHub Pages deployment with custom domain (cgt.ajithrn.com)
- GitHub Actions CI/CD pipeline

### Technical

- React 19 + TypeScript 6
- Vite 8 with PWA plugin (prompt mode, manual SW registration)
- Tailwind CSS 4
- Dexie.js 4 for IndexedDB
- Leaflet 1.9 + react-leaflet 5 for mapping
- jsPDF + html2canvas for PDF generation
- PapaParse for CSV export
- Lucide React for icons
- Custom usePWA hook for SW lifecycle management
