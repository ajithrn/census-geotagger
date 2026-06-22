/**
 * Canvas-based map renderer for export.
 * Fetches OSM tiles directly, stitches them, draws numbered pins.
 * No Leaflet, no html2canvas — works reliably on mobile.
 *
 * Memory-safe design for mobile PWAs:
 * - Respects browser canvas size limits (iOS ~16MP, Android ~32MP)
 * - Uses OffscreenCanvas to avoid compositor eviction
 * - Draws tiles in row-batches so decoded images can be GC'd between rows
 * - Exports via Blob pipeline (avoids massive data URL strings in memory)
 */

import type { HouseholdVisit } from '../types/survey';

// --- PLATFORM DETECTION ---

function isMobileDevice(): boolean {
  return typeof window !== 'undefined' &&
    (window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent));
}

/**
 * Returns the maximum safe canvas dimension for the current device.
 * iOS Safari: ~4096px per side (16MP total). Android Chrome: ~5792px (~32MP).
 * Desktop: effectively unlimited for our sizes.
 */
function getMaxCanvasSize(): number {
  if (typeof navigator === 'undefined') return 4096;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS) return 4096;
  if (isMobileDevice()) return 5792;
  return 8192; // Desktop — more than enough
}

/**
 * Clamp requested canvas size to the device's safe maximum.
 */
function clampCanvasSize(requested: number): number {
  return Math.min(requested, getMaxCanvasSize());
}

// --- TILE MATH ---

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  return (
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

// --- CALCULATE ZOOM & BOUNDS ---

function calculateZoom(visits: HouseholdVisit[], canvasSize: number): number {
  if (visits.length === 0) return 15;
  if (visits.length === 1) return 16;

  const lats = visits.map(v => v.geoLocation.latitude);
  const lngs = visits.map(v => v.geoLocation.longitude);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const span = Math.max(latSpan, lngSpan);

  // Find zoom where the span fits within ~60% of canvas (leave padding)
  for (let z = 18; z >= 1; z--) {
    const tilesNeeded = span * Math.pow(2, z) / 360;
    const pixelsNeeded = tilesNeeded * 256;
    if (pixelsNeeded < canvasSize * 0.6) return z;
  }
  return 10;
}

// --- FETCH TILE ---

async function fetchTile(x: number, y: number, z: number, retries: number = 2): Promise<HTMLImageElement | null> {
  const subdomain = ['a', 'b', 'c'][Math.abs(x + y) % 3];
  const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  // Try SW cache first (tiles already loaded by the map view)
  try {
    const cache = await caches.open('osm-tiles');
    for (const s of ['a', 'b', 'c']) {
      const cacheUrl = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
      const cachedResponse = await cache.match(cacheUrl);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        if (blob.size > 100) {
          const img = await blobToImage(blob);
          if (img) return img;
        }
      }
    }
  } catch {
    // Cache API not available — fall through to network
  }

  // Fallback: fetch from network with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        if (attempt < retries) { await delay(300); continue; }
        return null;
      }
      const blob = await response.blob();
      if (blob.size < 100) {
        if (attempt < retries) { await delay(300); continue; }
        return null;
      }
      const img = await blobToImage(blob);
      if (img) return img;
      if (attempt < retries) await delay(300);
    } catch {
      if (attempt < retries) await delay(300);
    }
  }
  return null;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement | null> {
  const imgUrl = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => { URL.revokeObjectURL(imgUrl); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(imgUrl); resolve(null); };
    image.src = imgUrl;
  });
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// --- BATCH CONCURRENT TILE FETCHING ---

interface TileResult {
  tx: number;
  ty: number;
  img: HTMLImageElement | null;
}

/**
 * Fetch tiles concurrently with controlled parallelism.
 * Limits concurrent requests to avoid overwhelming the browser/network.
 */
async function fetchTilesBatch(
  tiles: { tx: number; ty: number; z: number }[],
  concurrency: number = 6
): Promise<TileResult[]> {
  const results: TileResult[] = [];
  let index = 0;

  async function worker() {
    while (index < tiles.length) {
      const i = index++;
      const { tx, ty, z } = tiles[i];
      const img = await fetchTile(tx, ty, z, 2);
      results[i] = { tx, ty, img };
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tiles.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Fetch and draw tiles row by row. Each row is fetched concurrently,
 * drawn immediately, then image references are released so the GC can
 * reclaim decoded bitmap memory before the next row starts.
 * This keeps peak memory proportional to one row of tiles, not all tiles.
 */
async function fetchAndDrawTilesInRows(
  ctx: CanvasRenderingContext2D,
  startTileX: number,
  startTileY: number,
  endTileX: number,
  endTileY: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  concurrency: number
): Promise<void> {
  for (let ty = startTileY; ty < endTileY; ty++) {
    // Build row
    const rowTiles: { tx: number; ty: number; z: number }[] = [];
    for (let tx = startTileX; tx < endTileX; tx++) {
      rowTiles.push({ tx, ty, z: zoom });
    }

    // Fetch entire row concurrently
    const rowResults = await fetchTilesBatch(rowTiles, concurrency);

    // Draw and release
    for (const { tx, ty: tileY, img } of rowResults) {
      if (img) {
        const px = (tx - startTileX) * 256 + offsetX;
        const py = (tileY - startTileY) * 256 + offsetY;
        ctx.drawImage(img, px, py, 256, 256);
      }
    }
    // rowResults goes out of scope here — images can be GC'd
  }
}

// --- DRAW PIN ---

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  index: number,
  size: number = 24,
  rotation: number = 0,
  overlapCount: number = 0
) {
  ctx.save();

  const radius = size * 0.4;
  const legLength = radius + 6 + (overlapCount * 4); // longer leg for more overlaps

  // Calculate circle center and leg tip based on rotation
  // Rotation pivots around the GPS point (x, y) — leg tip stays at (x, y)
  const legTipX = x;
  const legTipY = y;
  const centerX = x - Math.sin(rotation) * legLength;
  const centerY = y - Math.cos(rotation) * legLength;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 2;

  // Circle head
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Line leg from circle edge to tip (GPS point)
  ctx.beginPath();
  ctx.moveTo(
    centerX + Math.sin(rotation) * radius,
    centerY + Math.cos(rotation) * radius
  );
  ctx.lineTo(legTipX, legTipY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Number text (always upright)
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.round(size * 0.35)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index), centerX, centerY);

  ctx.restore();
}

// --- MAIN RENDER FUNCTION ---

export async function renderMapToCanvas(visits: HouseholdVisit[], requestedSize: number = 1200): Promise<string | null> {
  if (visits.length === 0) return null;

  // Clamp to safe canvas dimensions for the device
  const canvasSize = clampCanvasSize(requestedSize);

  // Use OffscreenCanvas if available (avoids Chrome compositor eviction on mobile)
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasSize, canvasSize);
    ctx = canvas.getContext('2d');
  } else {
    const el = document.createElement('canvas');
    el.width = canvasSize;
    el.height = canvasSize;
    canvas = el;
    ctx = el.getContext('2d');
  }
  if (!ctx) return null;

  // Cast for drawPin compatibility (OffscreenCanvas2D is API-compatible)
  const drawCtx = ctx as unknown as CanvasRenderingContext2D;

  // Background
  drawCtx.fillStyle = '#e8e8e8';
  drawCtx.fillRect(0, 0, canvasSize, canvasSize);

  // Calculate center and zoom
  const lats = visits.map(v => v.geoLocation.latitude);
  const lngs = visits.map(v => v.geoLocation.longitude);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const zoom = calculateZoom(visits, canvasSize);

  // Calculate tile range
  const centerTileX = lon2tile(centerLng, zoom);
  const centerTileY = lat2tile(centerLat, zoom);

  const tilesPerSide = Math.ceil(canvasSize / 256) + 2;
  const startTileX = Math.floor(centerTileX - tilesPerSide / 2);
  const startTileY = Math.floor(centerTileY - tilesPerSide / 2);
  const endTileX = startTileX + tilesPerSide;
  const endTileY = startTileY + tilesPerSide;

  // Pixel offset for centering
  const offsetX = canvasSize / 2 - (centerTileX - startTileX) * 256;
  const offsetY = canvasSize / 2 - (centerTileY - startTileY) * 256;

  // Tile fetching strategy:
  // Mobile: row-by-row (lower peak memory — only one row of decoded images at a time)
  // Desktop: full-batch (maximum speed, memory is plentiful)
  const mobile = isMobileDevice();
  const concurrency = mobile ? 4 : 8;

  if (mobile) {
    // Row-by-row: fetch one row, draw, release, next row
    await fetchAndDrawTilesInRows(
      drawCtx, startTileX, startTileY, endTileX, endTileY,
      zoom, offsetX, offsetY, concurrency
    );
  } else {
    // Full batch: fetch all tiles concurrently, then draw
    const tilesToFetch: { tx: number; ty: number; z: number }[] = [];
    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        tilesToFetch.push({ tx, ty, z: zoom });
      }
    }

    const tileResults = await fetchTilesBatch(tilesToFetch, concurrency);

    for (const { tx, ty, img } of tileResults) {
      if (img) {
        const px = (tx - startTileX) * 256 + offsetX;
        const py = (ty - startTileY) * 256 + offsetY;
        drawCtx.drawImage(img, px, py, 256, 256);
      }
    }
  }

  // Draw pins (later pins on top)
  const pinSize = Math.max(20, Math.min(36, canvasSize / 30));

  // Calculate pixel positions and detect overlaps
  const pinPositions = visits.map((visit) => {
    const tileX = lon2tile(visit.geoLocation.longitude, zoom);
    const tileY = lat2tile(visit.geoLocation.latitude, zoom);
    const px = (tileX - startTileX) * 256 + offsetX;
    const py = (tileY - startTileY) * 256 + offsetY;
    return { px, py };
  });

  // Rotation angles: [0, 45°, -45°, 90°, -90°, 135°, -135°, 180°]
  const rotationSlots = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75, Math.PI];

  visits.forEach((visit, index) => {
    const { px, py } = pinPositions[index];

    // Count how many previous pins are within overlap distance (pinSize pixels)
    const overlapIndex = pinPositions.slice(0, index).filter(p =>
      Math.abs(p.px - px) < pinSize && Math.abs(p.py - py) < pinSize
    ).length;

    const rotation = overlapIndex > 0 ? (rotationSlots[overlapIndex % rotationSlots.length] || 0) : 0;
    drawPin(drawCtx, px, py, visit.markerColor, index + 1, pinSize, rotation, overlapIndex);
  });

  // Add attribution
  drawCtx.fillStyle = 'rgba(255,255,255,0.8)';
  drawCtx.fillRect(0, canvasSize - 20, canvasSize, 20);
  drawCtx.fillStyle = '#666';
  drawCtx.font = '10px system-ui, sans-serif';
  drawCtx.textAlign = 'center';
  drawCtx.fillText('© OpenStreetMap contributors', canvasSize / 2, canvasSize - 7);

  // Export via Blob pipeline — avoids holding a massive data URL string in memory.
  // On mobile this is critical: a 1024px PNG data URL is ~4MB of base64 text.
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blobToDataUrl(blob);
  }
  // HTMLCanvasElement — try toBlob first (less memory than toDataURL), fallback to toDataURL
  return new Promise((resolve) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) {
          blobToDataUrl(blob).then(resolve);
        } else {
          resolve((canvas as HTMLCanvasElement).toDataURL('image/png'));
        }
      },
      'image/png'
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

// --- EXPORT AS IMAGE FILE ---

export async function exportMapAsImage(visits: HouseholdVisit[], filename: string = 'census-map'): Promise<void> {
  // Mobile: 1024px (safe for iOS 16MP limit). Desktop: 3600px high-res.
  const mobile = isMobileDevice();
  const size = mobile ? 1024 : 3600;
  const imgData = await renderMapToCanvas(visits, size);
  if (!imgData) {
    alert('Could not render map. Make sure you have visits recorded.');
    return;
  }

  // Convert data URL to Blob for download (avoids holding two copies in memory)
  const response = await fetch(imgData);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
