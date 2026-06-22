# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] - 2025-06-22

### Performance

- Map tile fetching is now concurrent (worker-pool pattern) — 4-8x faster render times
  - Desktop: 8 concurrent fetches
  - Mobile: row-by-row with 4 concurrent fetches per row (lower peak memory)
- PDF map image converted to JPEG before embedding — 3-5x smaller payload, faster addImage parsing
- PDF detail pages generated in chunks with main-thread yielding (UI stays responsive during large exports)
- Backup import uses bulkPut() instead of per-record await loops (dramatically faster for large datasets)
- Duplicate detection during import uses single primaryKeys() query instead of per-record get()

### Changed

- Desktop map image export resolution increased to 3600px (from 2400px)
- Desktop PDF map render resolution increased to 1800px (from 1200px)
- Canvas size automatically clamped to device-safe maximums (iOS: 4096px, Android: 5792px, Desktop: 8192px)
- Canvas export uses toBlob() pipeline instead of toDataURL() to reduce memory pressure
- FitBounds only re-fits when the actual set of visible markers changes (not on every render)

### Fixed

- SurveyForm: useEffect dependency on editingVisit now properly handles null (cleans up edit state)
- SurveyForm: totalMembers computed from males + females at save time (prevents desync)
- ExportPanel: PDF and map image export errors now caught and shown to user (were silently swallowed)
- MapView: FitBounds no longer resets user's manual pan/zoom on every render cycle
- usePWA: setInterval for periodic SW update checks now cleaned up on unmount (memory leak)
- usePWA: isInstalled detection moved to useState initializer (eliminates cascading render)
- ProfilePage: removed unnecessary useEffect with setState (useState initializer sufficient)

### Code Quality

- All ESLint errors resolved (0 errors, 0 warnings)
- Removed unused exports (createNumberedIcon, getLastMapZoom)
- Removed unused variables and props across components
- Fixed function hoisting (loadVisits declared before useEffect in all components)
- SurveyFormData changed from empty interface to proper type alias
- Empty catch blocks annotated with explanation comments
- Consistent eslint-disable comments with rationale for legitimate suppressions

## [1.7.0] - 2025-06-22

### Added

- Help page under More menu (accordion FAQ format with 6 sections, 25+ Q&As)
- OffscreenCanvas for map export (prevents Chrome compositor memory eviction on mobile)
- SW cache lookup for tiles (uses cached tiles before network fetch)
- Tile retry logic (4 attempts with 500ms delay, blob size validation)

### Changed

- Map export renders tiles sequentially (fetch → draw → discard, one at a time)
- Export uses its own calculateZoom (not synced to map view zoom)
- Canvas sizes: 1024px mobile / 1200px desktop (PDF), 1024px / 2400px (image)
- Falls back to regular canvas on browsers without OffscreenCanvas
- More menu now has 4 items: Profile, Settings, Help, About

### Fixed

- Mobile PWA navbar disappearing on reload (100% height chain instead of dvh)
- Map tiles graying out during export (Chrome compositor evicting canvas backing store)
- Tiles failing to load due to OSM rate-limiting (sequential + retry solves this)

## [1.6.1] - 2025-06-21

### Fixed

- Incomplete map tile rendering on mobile (gray areas in export)
- Tile fetching now retries failed tiles (up to 3 attempts with 500ms delay)
- Batched tile fetching (4 at a time) to avoid OSM rate-limiting on mobile
- Sequential batches ensure all tiles load before pins are drawn

## [1.6.0] - 2025-06-21

### Added

- Rotated pin legs for overlapping markers (same GPS point → pins fan out like petals)
- Progressive leg length for overlaps (each additional pin gets a longer leg)
- Rotation applied consistently in both map view (CSS) and canvas export (trigonometry)

### Changed

- Pin numbers stay upright via counter-rotation (CSS) / no rotation (canvas)
- No more coordinate offsetting for overlaps — pins at exact GPS, only visual rotation
- Map fitBounds maxZoom reduced to 17 to prevent over-zoom breaking rotated pins
- Overlap detection: within ~5m (map view), within pinSize pixels (canvas export)
- Rotation slots: 0°, 45°, -45°, 90°, -90°, 135°, -135°, 180°

## [1.5.0] - 2025-06-21

### Changed

- Map export completely rewritten: pure canvas-based renderer (no Leaflet, no html2canvas)
- Fetches OSM tiles via fetch(), stitches grid on canvas, draws pins programmatically
- Works reliably on mobile (no CORS issues, no memory problems)
- Standalone map image export at 2400x2400px, PDF map at 1200x1200px
- Pin icon redesigned: circle head with line leg (consistent in map view and export)
- Pins drawn at 85% opacity for overlap visibility
- Removed html2canvas dependency
- Removed TrackZoom component and localStorage zoom tracking
- Removed unused getMapElement export from MapView
- Removed AboutModal.tsx (replaced by AboutPage)
- Removed unused default Vite assets
- Cleaned up src/assets directory

### Fixed

- Map not rendering in PDF/image export on mobile devices
- Pin rendering artifacts from complex path shapes

## [1.4.1] - 2025-06-21

### Added

- Language dropdown with predefined Indian languages (Malayalam, Tamil, Hindi, English, Kannada, Telugu, Bengali, Marathi, Gujarati, Odia, Punjabi, Urdu, Assamese, Konkani, Other)
- Language dropdown in both survey form (Step 2) and Profile page

### Fixed

- Bottom navbar disappearing on page reload or when PWA update banner appears
- Removed `fixed inset-0` on outer container that conflicted with mobile dynamic viewport
- Added `overflow-hidden h-dvh` to body to prevent scroll bounce hiding navbar

## [1.4.0] - 2025-06-21

### Added

- Profile page (renamed from Settings) for surveyor defaults
- Settings page with data backup, import (merge/replace), and clear data
- JSON backup export with version, timestamp, and record count
- Import & Merge: adds records, skips duplicates by ID
- Import & Replace: clears all data first, then restores from backup
- Usage guide documentation (docs/usage-guide.md)

### Changed

- More menu now shows 3 options: Profile, Settings, About
- Sub-page title bar minimized (thin inline bar with back + label)
- Page titles moved inside content area (larger, more prominent)
- Danger zone / delete moved from Export panel to Settings page
- Export panel is now clean (only export formats)

## [1.3.1] - 2025-06-21

### Changed

- More menu now opens as bottom sheet popup (not a full tab page)
- Settings and About pages render in main content area with sub-header (Back + title)
- App header always stays visible regardless of which page is shown
- PWA notifications (update, install, offline) use fixed positioning with z-[9999] outside app frame
- Outer container uses `fixed inset-0` to prevent pull-to-refresh from breaking navbar position
- Settings page header removed (provided by App shell)
- About page spacing improved (larger logo, more section padding)

### Fixed

- Pull-to-refresh causing bottom navbar to scroll off-screen
- PWA update banner not floating (was pushing content down)
- Settings/About pages overlapping app header

## [1.3.0] - 2025-06-21

### Added

- Export Map Image as standalone hi-res PNG
- Fullscreen button on map view (native Fullscreen API)
- Visit time shown in Records list (below date)

### Changed

- Export always renders at full resolution (1800x1800 @3x) regardless of device
- Export uses compact 20px pins (vs 30px in-app) for clearer separation
- Overlap offset reduced to ~5m and only triggers for truly identical coordinates (<1m apart)
- Map view fitBounds allows up to zoom 18 for close-up detail
- MapContainer max zoom increased to 19 for manual zoom
- PDF Map Index table uses proportional columns with header background and proper alignment
- Single `renderMapImage()` function shared by both PDF and image export
- Removed zoom/localStorage dependency from export — always fitBounds with generous padding
- Visit ordering: first recorded = #1 (chronological, not reversed)

### Fixed

- PDF index table columns overflowing off page
- Pin badge number vertical alignment in PDF index
- Close pins appearing too far apart in export due to aggressive offset
- Export map not rendering on mobile (was OOM from oversized canvas — now always 1800px works)

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
