/**
 * Canvas-based map renderer for export.
 * Fetches OSM tiles directly, stitches them, draws numbered pins.
 * No Leaflet, no html2canvas — works reliably on mobile.
 */

import type { HouseholdVisit } from '../types/survey';

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

// Reserved for future use (inverse tile math)
// function tile2lon(x: number, zoom: number) { return (x / Math.pow(2, zoom)) * 360 - 180; }
// function tile2lat(y: number, zoom: number) { const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom); return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }

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
    // Try all subdomain variants since Leaflet may have cached with a different one
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
        if (attempt < retries) { await delay(500); continue; }
        return null;
      }
      const blob = await response.blob();
      if (blob.size < 100) {
        if (attempt < retries) { await delay(500); continue; }
        return null;
      }
      const img = await blobToImage(blob);
      if (img) return img;
      if (attempt < retries) await delay(500);
    } catch {
      if (attempt < retries) await delay(500);
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

// Reserved: batch fetching (not used — sequential draw is more reliable on mobile)
// async function fetchTilesInBatches(...) { ... }

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

export async function renderMapToCanvas(visits: HouseholdVisit[], canvasSize: number = 1200): Promise<string | null> {
  if (visits.length === 0) return null;

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

  // Fetch and draw tiles ONE AT A TIME — draw immediately, then discard image
  // This prevents mobile browsers from GC'ing images before we draw them
  for (let ty = startTileY; ty < endTileY; ty++) {
    for (let tx = startTileX; tx < endTileX; tx++) {
      const px = (tx - startTileX) * 256 + offsetX;
      const py = (ty - startTileY) * 256 + offsetY;
      const img = await fetchTile(tx, ty, zoom, 3);
      if (img) {
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

  // Convert to data URL
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
  return (canvas as HTMLCanvasElement).toDataURL('image/png');
}

// --- EXPORT AS IMAGE FILE ---

export async function exportMapAsImage(visits: HouseholdVisit[], filename: string = 'census-map'): Promise<void> {
  // Mobile: 1024px (OffscreenCanvas avoids eviction). Desktop: 2400px
  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const size = isMobile ? 1024 : 2400;
  const imgData = await renderMapToCanvas(visits, size);
  if (!imgData) {
    alert('Could not render map. Make sure you have visits recorded.');
    return;
  }

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
