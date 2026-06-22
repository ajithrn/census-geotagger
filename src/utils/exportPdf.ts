import jsPDF from 'jspdf';
import type { HouseholdVisit } from '../types/survey';
import { MARKER_COLORS, VISIT_STATUS_LABELS, HOUSEHOLD_TYPE_LABELS, STRUCTURE_TYPE_LABELS, OCCUPATION_LABELS, INCOME_LABELS, WATER_SOURCE_LABELS, RATION_CARD_LABELS } from '../types/survey';
import { renderMapToCanvas } from './mapRenderer';

/* eslint-disable no-useless-assignment */
// y tracks vertical cursor position in PDF — assigned at end of sections for consistency even when a new page resets it

// Re-export canvas-based map image export
export { exportMapAsImage as exportMapImage } from './mapRenderer';

/** Yield to the main thread to keep UI responsive during heavy PDF generation */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function exportToPdf(
  visits: HouseholdVisit[],
  _mapElement: HTMLElement | null,
  filename: string = 'census-report'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 14;
  const UW = W - M * 2;
  let y = M;

  // === COVER / MAP PAGE ===
  drawHeader(pdf, y, W);
  y += 16;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated: ${new Date().toLocaleString()}  |  Visits: ${visits.length}${visits.length > 0 ? '  |  Surveyor: ' + visits[0].surveyorName : ''}`, W / 2, y, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 8;

  // Render map — use JPEG for smaller data URL and faster addImage parsing
  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const mapImg = await renderMapToCanvas(visits, isMobile ? 1024 : 1800);
  if (mapImg) {
    const mapH = Math.min(UW, H - y - M - 20);
    // Convert PNG data URL to JPEG for faster PDF embedding (smaller payload)
    const jpegImg = await convertToJpeg(mapImg);
    pdf.addImage(jpegImg, 'JPEG', M, y, UW, mapH);
    y += mapH + 4;
    drawMapLegend(pdf, y, M, visits);
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text('Map could not be rendered', W / 2, y + 20, { align: 'center' });
    pdf.setTextColor(0);
    y += 40;
  }

  // === MAP INDEX PAGE ===
  pdf.addPage();
  y = M;
  drawSectionTitle(pdf, 'Map Index', M, y);
  y += 9;
  pdf.setFontSize(7.5);
  pdf.setTextColor(100);
  pdf.text('Pin numbers correspond to markers on the map.', M, y);
  pdf.setTextColor(0);
  y += 6;
  y = drawIndexTable(pdf, visits, M, y, UW, H);

  // === STATISTICS DASHBOARD PAGE ===
  pdf.addPage();
  y = M;
  drawSectionTitle(pdf, 'Statistics Dashboard', M, y);
  y += 10;
  y = drawStatsDashboard(pdf, visits, M, y, UW, H);

  // === DETAIL PAGES (chunked to keep UI responsive) ===
  const CHUNK_SIZE = 20;
  for (let i = 0; i < visits.length; i++) {
    pdf.addPage();
    y = M;
    y = drawDetailPage(pdf, visits[i], i, M, y, UW, H);

    // Yield every CHUNK_SIZE pages to avoid blocking the main thread
    if ((i + 1) % CHUNK_SIZE === 0 && i < visits.length - 1) {
      await yieldToMain();
    }
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Convert a PNG data URL to JPEG for much faster PDF addImage processing.
 * JPEG is ~3-5x smaller than PNG for map imagery, significantly reducing
 * the time jsPDF spends parsing and embedding the image.
 */
async function convertToJpeg(pngDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(pngDataUrl); return; }
      // White background (JPEG has no alpha)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(pngDataUrl); // Fallback to PNG on error
    img.src = pngDataUrl;
  });
}

// --- DRAWING HELPERS ---

function drawHeader(pdf: jsPDF, y: number, W: number) {
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Census GeoTagger', W / 2, y, { align: 'center' });
  y += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text('Field Survey Report', W / 2, y, { align: 'center' });
  pdf.setTextColor(0);
}

function drawSectionTitle(pdf: jsPDF, title: string, M: number, y: number) {
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, M, y);
  pdf.setDrawColor(200);
  pdf.line(M, y + 2, M + 50, y + 2);
}

function drawMapLegend(pdf: jsPDF, y: number, M: number, visits: HouseholdVisit[]) {
  pdf.setFontSize(7.5);
  let x = M;
  Object.entries(MARKER_COLORS).forEach(([status, color]) => {
    pdf.setFillColor(color);
    pdf.circle(x + 2, y, 2, 'F');
    const count = visits.filter(v => v.visitStatus === status).length;
    const label = `${VISIT_STATUS_LABELS[status as keyof typeof VISIT_STATUS_LABELS]} (${count})`;
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x + 5.5, y + 1);
    x += pdf.getTextWidth(label) + 14;
  });
}

function drawIndexTable(pdf: jsPDF, visits: HouseholdVisit[], M: number, y: number, UW: number, H: number): number {
  const colRatios = [0.05, 0.18, 0.22, 0.08, 0.13, 0.13, 0.11, 0.10];
  const cols = colRatios.map(r => r * UW);
  const headers = ['#', 'Name', 'Address', 'Mbrs', 'Type', 'Occupation', 'Status', 'Ward'];

  const drawTableHeader = () => {
    pdf.setFillColor(245, 245, 245);
    pdf.rect(M, y - 3.5, UW, 5.5, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    let x = M;
    headers.forEach((h, i) => { pdf.text(h, x + 1.5, y); x += cols[i]; });
    pdf.setTextColor(0, 0, 0);
    y += 3;
    pdf.setDrawColor(180, 180, 180);
    pdf.line(M, y, M + UW, y);
    y += 4;
    return y;
  };

  y = drawTableHeader();

  visits.forEach((visit, index) => {
    if (y > H - 15) { pdf.addPage(); y = M; y = drawTableHeader(); }
    let x = M;
    pdf.setFillColor(visit.markerColor);
    pdf.circle(x + 3.5, y - 0.5, 2.2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(index + 1), x + 3.5, y + 0.5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    x += cols[0];
    const row = [visit.headName.slice(0, 16), visit.address.slice(0, 20), String(visit.totalMembers), HOUSEHOLD_TYPE_LABELS[visit.householdType].slice(0, 11), OCCUPATION_LABELS[visit.primaryOccupation].slice(0, 11), VISIT_STATUS_LABELS[visit.visitStatus].slice(0, 10), (visit.ward || '—').slice(0, 8)];
    row.forEach((cell, i) => { pdf.text(cell, x + 1.5, y); x += cols[i + 1]; });
    y += 5.5;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(M, y - 2, M + UW, y - 2);
  });
  return y;
}

function drawStatsDashboard(pdf: jsPDF, visits: HouseholdVisit[], M: number, y: number, UW: number, _H: number): number { // eslint-disable-line @typescript-eslint/no-unused-vars
  const total = visits.length;
  if (total === 0) { pdf.setFontSize(9); pdf.text('No data available.', M, y); return y + 10; }

  const pop = visits.reduce((s, v) => s + v.totalMembers, 0);
  const males = visits.reduce((s, v) => s + v.totalMales, 0);
  const females = visits.reduce((s, v) => s + v.totalFemales, 0);
  const children = visits.reduce((s, v) => s + v.childrenUnder18, 0);
  const seniors = visits.reduce((s, v) => s + v.seniorCitizens, 0);
  const withElec = visits.filter(v => v.hasElectricity).length;
  const withToilet = visits.filter(v => v.hasToilet).length;
  const completed = visits.filter(v => v.visitStatus === 'completed').length;
  const partial = visits.filter(v => v.visitStatus === 'partial').length;
  const revisit = visits.filter(v => v.visitStatus === 'revisit').length;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  const boxW = UW / 4 - 2;
  const metrics = [{ label: 'Households', value: String(total) }, { label: 'Population', value: String(pop) }, { label: 'Avg. Size', value: (pop / total).toFixed(1) }, { label: 'Completed', value: `${pct(completed)}%` }];
  pdf.setDrawColor(220);
  metrics.forEach((m, i) => {
    const x = M + i * (boxW + 2.5);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, boxW, 18, 2, 2, 'F');
    pdf.rect(x, y, boxW, 18);
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(m.value, x + boxW / 2, y + 10, { align: 'center' });
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100);
    pdf.text(m.label, x + boxW / 2, y + 15, { align: 'center' });
    pdf.setTextColor(0);
  });
  y += 24;

  drawSubheading(pdf, 'Demographics', M, y); y += 6;
  y = drawKV(pdf, [['Total Males', `${males} (${((males/pop)*100).toFixed(1)}%)`], ['Total Females', `${females} (${((females/pop)*100).toFixed(1)}%)`], ['Children (under 18)', `${children}`], ['Senior Citizens (60+)', `${seniors}`], ['Sex Ratio (F/1000 M)', males > 0 ? String(Math.round((females/males)*1000)) : '—']], M, y);
  y += 4;

  drawSubheading(pdf, 'Infrastructure', M, y); y += 6;
  const infraRows: [string, string][] = [['Electricity Access', `${withElec} / ${total} (${pct(withElec)}%)`], ['Toilet Facility', `${withToilet} / ${total} (${pct(withToilet)}%)`]];
  const waterCounts: Record<string, number> = {};
  visits.forEach(v => { waterCounts[v.waterSource] = (waterCounts[v.waterSource] || 0) + 1; });
  Object.entries(waterCounts).forEach(([src, count]) => { infraRows.push([`Water: ${WATER_SOURCE_LABELS[src as keyof typeof WATER_SOURCE_LABELS] || src}`, `${count} (${pct(count)}%)`]); });
  y = drawKV(pdf, infraRows, M, y); y += 4;

  drawSubheading(pdf, 'Occupation Distribution', M, y); y += 6;
  const occCounts: Record<string, number> = {};
  visits.forEach(v => { occCounts[v.primaryOccupation] = (occCounts[v.primaryOccupation] || 0) + 1; });
  y = drawKV(pdf, Object.entries(occCounts).map(([o, c]) => [OCCUPATION_LABELS[o as keyof typeof OCCUPATION_LABELS] || o, `${c} (${pct(c)}%)`]), M, y); y += 4;

  drawSubheading(pdf, 'Household Types', M, y); y += 6;
  const typeCounts: Record<string, number> = {};
  visits.forEach(v => { typeCounts[v.householdType] = (typeCounts[v.householdType] || 0) + 1; });
  y = drawKV(pdf, Object.entries(typeCounts).map(([t, c]) => [HOUSEHOLD_TYPE_LABELS[t as keyof typeof HOUSEHOLD_TYPE_LABELS] || t, `${c} (${pct(c)}%)`]), M, y); y += 4;

  drawSubheading(pdf, 'Visit Status', M, y); y += 6;
  y = drawKV(pdf, [['Completed', `${completed} (${pct(completed)}%)`], ['Partial', `${partial} (${pct(partial)}%)`], ['Revisit Needed', `${revisit} (${pct(revisit)}%)`]], M, y);
  return y;
}

function drawSubheading(pdf: jsPDF, text: string, M: number, y: number) {
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(60); pdf.text(text, M, y); pdf.setTextColor(0);
}

function drawKV(pdf: jsPDF, rows: [string, string][], M: number, y: number): number {
  pdf.setFontSize(8);
  rows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80); pdf.text(label, M + 2, y);
    pdf.setTextColor(0); pdf.setFont('helvetica', 'bold'); pdf.text(value, M + 70, y);
    y += 4.5;
  });
  return y;
}

function drawDetailPage(pdf: jsPDF, visit: HouseholdVisit, index: number, M: number, y: number, UW: number, H: number): number {
  pdf.setFillColor(visit.markerColor);
  pdf.circle(M + 5, y + 3, 5, 'F');
  pdf.setTextColor(255); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
  pdf.text(String(index + 1), M + 5, y + 4.5, { align: 'center' });
  pdf.setTextColor(0); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(visit.headName, M + 14, y + 5);
  y += 12;

  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(120);
  pdf.text(`${visit.householdId}  \u2022  ${VISIT_STATUS_LABELS[visit.visitStatus]}  \u2022  ${new Date(visit.createdAt).toLocaleDateString()}  \u2022  Surveyor: ${visit.surveyorName}`, M, y);
  pdf.setTextColor(0); y += 5;
  pdf.setDrawColor(230); pdf.line(M, y, M + UW, y); y += 6;

  const sections: { title: string; rows: [string, string][] }[] = [
    { title: 'Location', rows: [['Address', visit.address], ['Landmark', visit.landmark || '—'], ['Ward', visit.ward || '—'], ['GPS', `${visit.geoLocation.latitude.toFixed(6)}, ${visit.geoLocation.longitude.toFixed(6)}`], ['Accuracy', `\u00B1${visit.geoLocation.accuracy.toFixed(0)}m`], ['Phone', visit.headPhone || '—']] },
    { title: 'Demographics', rows: [['Total Members', String(visit.totalMembers)], ['Males / Females', `${visit.totalMales} / ${visit.totalFemales}`], ['Children (<18)', String(visit.childrenUnder18)], ['Seniors (60+)', String(visit.seniorCitizens)], ['Language', visit.primaryLanguage || '—']] },
    { title: 'Housing', rows: [['Ownership', HOUSEHOLD_TYPE_LABELS[visit.householdType]], ['Structure', STRUCTURE_TYPE_LABELS[visit.structureType]], ['Water', WATER_SOURCE_LABELS[visit.waterSource]], ['Electricity', visit.hasElectricity ? 'Yes' : 'No'], ['Toilet', visit.hasToilet ? 'Yes' : 'No']] },
    { title: 'Socioeconomic', rows: [['Occupation', OCCUPATION_LABELS[visit.primaryOccupation]], ['Income', INCOME_LABELS[visit.incomeRange]], ['Ration Card', RATION_CARD_LABELS[visit.rationCardType]]] },
    { title: 'Health & Education', rows: [['School Children', String(visit.schoolGoingChildren)], ['School Distance', `${visit.nearestSchoolKm} km`], ['Disabled', visit.hasDisabledMembers ? 'Yes' : 'No'], ['Chronic Illness', visit.hasChronicIllness ? 'Yes' : 'No']] },
  ];

  sections.forEach(section => {
    if (y > H - 30) { pdf.addPage(); y = M; }
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(50);
    pdf.text(section.title, M, y); pdf.setTextColor(0); y += 5;
    pdf.setFontSize(8);
    section.rows.forEach(([label, value]) => {
      if (y > H - 15) { pdf.addPage(); y = M; }
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100); pdf.text(label, M + 3, y);
      pdf.setTextColor(0); pdf.setFont('helvetica', 'bold'); pdf.text(value, M + 52, y);
      y += 4.5;
    });
    y += 3;
  });

  if (visit.notes) {
    if (y > H - 20) { pdf.addPage(); y = M; }
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(50);
    pdf.text('Notes', M, y); pdf.setTextColor(0); y += 5;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'italic');
    const lines = pdf.splitTextToSize(visit.notes, UW - 6);
    pdf.text(lines, M + 3, y); y += lines.length * 4;
  }
  return y;
}
