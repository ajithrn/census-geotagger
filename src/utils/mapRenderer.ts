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

async function fetchTile(x: number, y: number, z: number): Promise<HTMLImageElement | null> {
  const subdomain = ['a', 'b', 'c'][Math.abs(x + y) % 3];
  const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const imgUrl = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(imgUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(imgUrl);
        resolve(null);
      };
      img.src = imgUrl;
    });
  } catch {
    return null;
  }
}

// --- DRAW PIN ---

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  index: number,
  size: number = 24
) {
  ctx.save();

  const radius = size * 0.4;
  const centerY = y - radius - 4;
  const tipY = y + 2;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 2;

  // Circle head
  ctx.beginPath();
  ctx.arc(x, centerY, radius, 0, Math.PI * 2);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Line leg pointing down
  ctx.beginPath();
  ctx.moveTo(x, centerY + radius);
  ctx.lineTo(x, tipY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Number text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.round(size * 0.35)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index), x, centerY);

  ctx.restore();
}

// --- MAIN RENDER FUNCTION ---

export async function renderMapToCanvas(visits: HouseholdVisit[], canvasSize: number = 1200): Promise<string | null> {
  if (visits.length === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

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

  // Fetch and draw tiles
  const tilePromises: Promise<{ img: HTMLImageElement | null; px: number; py: number }>[] = [];

  for (let ty = startTileY; ty < endTileY; ty++) {
    for (let tx = startTileX; tx < endTileX; tx++) {
      const px = (tx - startTileX) * 256 + offsetX;
      const py = (ty - startTileY) * 256 + offsetY;
      tilePromises.push(
        fetchTile(tx, ty, zoom).then(img => ({ img, px, py }))
      );
    }
  }

  const tiles = await Promise.all(tilePromises);
  tiles.forEach(({ img, px, py }) => {
    if (img) {
      ctx.drawImage(img, px, py, 256, 256);
    }
  });

  // Draw pins (later pins on top)
  const pinSize = Math.max(20, Math.min(36, canvasSize / 30));
  visits.forEach((visit, index) => {
    // Convert lat/lng to pixel position on canvas
    const tileX = lon2tile(visit.geoLocation.longitude, zoom);
    const tileY = lat2tile(visit.geoLocation.latitude, zoom);
    const px = (tileX - startTileX) * 256 + offsetX;
    const py = (tileY - startTileY) * 256 + offsetY;

    drawPin(ctx, px, py, visit.markerColor, index + 1, pinSize);
  });

  // Add attribution
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(0, canvasSize - 20, canvasSize, 20);
  ctx.fillStyle = '#666';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('© OpenStreetMap contributors', canvasSize / 2, canvasSize - 7);

  return canvas.toDataURL('image/png');
}

// --- EXPORT AS IMAGE FILE ---

export async function exportMapAsImage(visits: HouseholdVisit[], filename: string = 'census-map'): Promise<void> {
  const imgData = await renderMapToCanvas(visits, 2400);
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
