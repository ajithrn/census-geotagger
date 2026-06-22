import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import L from 'leaflet';
import type { HouseholdVisit } from '../types/survey';
import { MARKER_COLORS, VISIT_STATUS_LABELS, HOUSEHOLD_TYPE_LABELS, STRUCTURE_TYPE_LABELS, OCCUPATION_LABELS, INCOME_LABELS, WATER_SOURCE_LABELS, RATION_CARD_LABELS } from '../types/survey';

// --- MAP RENDERING ---

// Compact pin icon for export (smaller so close pins don't overlap)
function createExportPin(color: string, index: number): L.DivIcon {
  const fontSize = index > 99 ? '6px' : index > 9 ? '7px' : '8px';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      position: relative;
      width: 20px;
      height: 26px;
    ">
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        position: absolute;
        top: 0;
        left: 0;
      "></div>
      <span style="
        position: absolute;
        top: 0;
        left: 0;
        width: 20px;
        height: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize};
        font-weight: 800;
        color: white;
        text-shadow: 0 1px 1px rgba(0,0,0,0.4);
      ">${index}</span>
    </div>`,
    iconSize: [20, 26],
    iconAnchor: [10, 26],
    popupAnchor: [0, -24],
  });
}

async function renderMapImage(visits: HouseholdVisit[]): Promise<string | null> {
  if (visits.length === 0) return null;

  // Always hi-res for export regardless of device
  const mapSize = 1800;
  const captureScale = 3;

  // Create hidden container
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${mapSize}px;height:${mapSize}px;z-index:-1;`;
  document.body.appendChild(container);

  try {
    // Create Leaflet map
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    // Add tile layer
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add numbered markers with compact export pins
    // Only offset markers at truly identical coordinates (within ~1m)
    visits.forEach((visit, index) => {
      const sameLocCount = visits.slice(0, index).filter(v =>
        Math.abs(v.geoLocation.latitude - visit.geoLocation.latitude) < 0.00001 &&
        Math.abs(v.geoLocation.longitude - visit.geoLocation.longitude) < 0.00001
      ).length;
      const offsetLat = sameLocCount * 0.00005;
      const offsetLng = sameLocCount * 0.00005;

      L.marker(
        [visit.geoLocation.latitude + offsetLat, visit.geoLocation.longitude + offsetLng],
        { icon: createExportPin(visit.markerColor, index + 1) }
      ).addTo(map);
    });

    // Always fit bounds zoomed in tight so pins are clearly separated
    const bounds = L.latLngBounds(
      visits.map(v => [v.geoLocation.latitude, v.geoLocation.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [200, 200], maxZoom: 18 });

    // Wait for tiles to load
    await new Promise<void>((resolve) => {
      let loaded = false;
      tileLayer.on('load', () => {
        if (!loaded) { loaded = true; setTimeout(resolve, 500); }
      });
      setTimeout(resolve, 4000);
    });

    // Extra wait for marker rendering
    await new Promise(resolve => setTimeout(resolve, 600));

    // High-res screenshot
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale: captureScale,
      logging: false,
      backgroundColor: '#f8fafc',
    });

    const imgData = canvas.toDataURL('image/png');

    // Cleanup
    map.remove();
    return imgData;
  } catch (err) {
    console.error('Map render failed:', err);
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

// --- EXPORT MAP AS IMAGE ---

export async function exportMapImage(visits: HouseholdVisit[], filename: string = 'census-map'): Promise<void> {
  const imgData = await renderMapImage(visits);
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

export async function exportToPdf(
  visits: HouseholdVisit[],
  _mapElement: HTMLElement | null, // kept for API compat, but we render our own
  filename: string = 'census-report'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 14; // margin
  const UW = W - M * 2; // usable width
  let y = M;

  // === COVER / MAP PAGE ===
  drawHeader(pdf, y, W);
  y += 16;

  // Metadata line
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated: ${new Date().toLocaleString()}  |  Visits: ${visits.length}  |  Surveyor${visits.length > 0 ? ': ' + visits[0].surveyorName : ''}`, W / 2, y, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 8;

  // Render map image (same function used for standalone image export)
  const mapImg = await renderMapImage(visits);
  if (mapImg) {
    const mapH = Math.min(UW, H - y - M - 20); // square: width = height, capped to fit page
    pdf.addImage(mapImg, 'PNG', M, y, UW, mapH);
    y += mapH + 4;

    // Legend below map
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

  // === DETAIL PAGES ===
  visits.forEach((visit, index) => {
    pdf.addPage();
    y = M;
    y = drawDetailPage(pdf, visit, index, M, y, UW, H, W);
  });

  pdf.save(`${filename}.pdf`);
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
  // Proportional columns that fit within usable width
  const colRatios = [0.05, 0.18, 0.22, 0.08, 0.13, 0.13, 0.11, 0.10];
  const cols = colRatios.map(r => r * UW);
  const headers = ['#', 'Name', 'Address', 'Mbrs', 'Type', 'Occupation', 'Status', 'Ward'];

  const drawTableHeader = () => {
    // Header background
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
    if (y > H - 15) {
      pdf.addPage();
      y = M;
      y = drawTableHeader();
    }

    let x = M;

    // Colored number badge
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

    const row = [
      visit.headName.slice(0, 16),
      visit.address.slice(0, 20),
      String(visit.totalMembers),
      HOUSEHOLD_TYPE_LABELS[visit.householdType].slice(0, 11),
      OCCUPATION_LABELS[visit.primaryOccupation].slice(0, 11),
      VISIT_STATUS_LABELS[visit.visitStatus].slice(0, 10),
      (visit.ward || '—').slice(0, 8),
    ];
    row.forEach((cell, i) => { pdf.text(cell, x + 1.5, y); x += cols[i + 1]; });
    y += 5.5;

    // Row separator
    pdf.setDrawColor(230, 230, 230);
    pdf.line(M, y - 2, M + UW, y - 2);
  });

  return y;
}

function drawStatsDashboard(pdf: jsPDF, visits: HouseholdVisit[], M: number, y: number, UW: number, _H: number): number {
  const total = visits.length;
  if (total === 0) {
    pdf.setFontSize(9);
    pdf.text('No data available.', M, y);
    return y + 10;
  }

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

  // Key metrics row
  const boxW = UW / 4 - 2;
  const metrics = [
    { label: 'Households', value: String(total) },
    { label: 'Population', value: String(pop) },
    { label: 'Avg. Size', value: (pop / total).toFixed(1) },
    { label: 'Completed', value: `${pct(completed)}%` },
  ];

  pdf.setDrawColor(220);
  metrics.forEach((m, i) => {
    const x = M + i * (boxW + 2.5);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, boxW, 18, 2, 2, 'F');
    pdf.rect(x, y, boxW, 18);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(m.value, x + boxW / 2, y + 10, { align: 'center' });
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100);
    pdf.text(m.label, x + boxW / 2, y + 15, { align: 'center' });
    pdf.setTextColor(0);
  });
  y += 24;

  // Demographics section
  drawSubheading(pdf, 'Demographics', M, y);
  y += 6;
  const demoRows: [string, string][] = [
    ['Total Males', `${males} (${((males / pop) * 100).toFixed(1)}%)`],
    ['Total Females', `${females} (${((females / pop) * 100).toFixed(1)}%)`],
    ['Children (under 18)', `${children}`],
    ['Senior Citizens (60+)', `${seniors}`],
    ['Sex Ratio (F per 1000 M)', males > 0 ? String(Math.round((females / males) * 1000)) : '—'],
  ];
  y = drawKeyValueRows(pdf, demoRows, M, y);
  y += 4;

  // Infrastructure
  drawSubheading(pdf, 'Infrastructure', M, y);
  y += 6;
  const infraRows: [string, string][] = [
    ['Electricity Access', `${withElec} / ${total} (${pct(withElec)}%)`],
    ['Toilet Facility', `${withToilet} / ${total} (${pct(withToilet)}%)`],
  ];
  // Water sources breakdown
  const waterCounts: Record<string, number> = {};
  visits.forEach(v => { waterCounts[v.waterSource] = (waterCounts[v.waterSource] || 0) + 1; });
  Object.entries(waterCounts).forEach(([src, count]) => {
    infraRows.push([`Water: ${WATER_SOURCE_LABELS[src as keyof typeof WATER_SOURCE_LABELS] || src}`, `${count} (${pct(count)}%)`]);
  });
  y = drawKeyValueRows(pdf, infraRows, M, y);
  y += 4;

  // Socioeconomic
  drawSubheading(pdf, 'Occupation Distribution', M, y);
  y += 6;
  const occCounts: Record<string, number> = {};
  visits.forEach(v => { occCounts[v.primaryOccupation] = (occCounts[v.primaryOccupation] || 0) + 1; });
  const occRows: [string, string][] = Object.entries(occCounts).map(([occ, count]) => [
    OCCUPATION_LABELS[occ as keyof typeof OCCUPATION_LABELS] || occ,
    `${count} (${pct(count)}%)`
  ]);
  y = drawKeyValueRows(pdf, occRows, M, y);
  y += 4;

  // Household types
  drawSubheading(pdf, 'Household Types', M, y);
  y += 6;
  const typeCounts: Record<string, number> = {};
  visits.forEach(v => { typeCounts[v.householdType] = (typeCounts[v.householdType] || 0) + 1; });
  const typeRows: [string, string][] = Object.entries(typeCounts).map(([t, count]) => [
    HOUSEHOLD_TYPE_LABELS[t as keyof typeof HOUSEHOLD_TYPE_LABELS] || t,
    `${count} (${pct(count)}%)`
  ]);
  y = drawKeyValueRows(pdf, typeRows, M, y);
  y += 4;

  // Visit status
  drawSubheading(pdf, 'Visit Status', M, y);
  y += 6;
  const statusRows: [string, string][] = [
    ['Completed', `${completed} (${pct(completed)}%)`],
    ['Partial', `${partial} (${pct(partial)}%)`],
    ['Revisit Needed', `${revisit} (${pct(revisit)}%)`],
  ];
  y = drawKeyValueRows(pdf, statusRows, M, y);

  return y;
}

function drawSubheading(pdf: jsPDF, text: string, M: number, y: number) {
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60);
  pdf.text(text, M, y);
  pdf.setTextColor(0);
}

function drawKeyValueRows(pdf: jsPDF, rows: [string, string][], M: number, y: number): number {
  pdf.setFontSize(8);
  rows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80);
    pdf.text(label, M + 2, y);
    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, M + 70, y);
    y += 4.5;
  });
  return y;
}

function drawDetailPage(pdf: jsPDF, visit: HouseholdVisit, index: number, M: number, y: number, UW: number, H: number, _W: number): number {
  // Header with pin badge
  pdf.setFillColor(visit.markerColor);
  pdf.circle(M + 5, y + 3, 5, 'F');
  pdf.setTextColor(255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(String(index + 1), M + 5, y + 4.5, { align: 'center' });
  pdf.setTextColor(0);

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(visit.headName, M + 14, y + 5);
  y += 12;

  // Subtitle
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(120);
  pdf.text(`${visit.householdId}  \u2022  ${VISIT_STATUS_LABELS[visit.visitStatus]}  \u2022  ${new Date(visit.createdAt).toLocaleDateString()}  \u2022  Surveyor: ${visit.surveyorName}`, M, y);
  pdf.setTextColor(0);
  y += 5;

  pdf.setDrawColor(230);
  pdf.line(M, y, M + UW, y);
  y += 6;

  // Sections
  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: 'Location',
      rows: [
        ['Address', visit.address],
        ['Landmark', visit.landmark || '—'],
        ['Ward / Area', visit.ward || '—'],
        ['GPS', `${visit.geoLocation.latitude.toFixed(6)}, ${visit.geoLocation.longitude.toFixed(6)}`],
        ['Accuracy', `\u00B1${visit.geoLocation.accuracy.toFixed(0)}m`],
        ['Phone', visit.headPhone || '—'],
      ]
    },
    {
      title: 'Demographics',
      rows: [
        ['Total Members', String(visit.totalMembers)],
        ['Males / Females', `${visit.totalMales} / ${visit.totalFemales}`],
        ['Children (<18)', String(visit.childrenUnder18)],
        ['Seniors (60+)', String(visit.seniorCitizens)],
        ['Primary Language', visit.primaryLanguage || '—'],
      ]
    },
    {
      title: 'Housing & Infrastructure',
      rows: [
        ['Ownership', HOUSEHOLD_TYPE_LABELS[visit.householdType]],
        ['Structure', STRUCTURE_TYPE_LABELS[visit.structureType]],
        ['Water Source', WATER_SOURCE_LABELS[visit.waterSource]],
        ['Electricity', visit.hasElectricity ? 'Yes' : 'No'],
        ['Toilet', visit.hasToilet ? 'Yes' : 'No'],
      ]
    },
    {
      title: 'Socioeconomic',
      rows: [
        ['Occupation', OCCUPATION_LABELS[visit.primaryOccupation]],
        ['Income Range', INCOME_LABELS[visit.incomeRange]],
        ['Ration Card', RATION_CARD_LABELS[visit.rationCardType]],
      ]
    },
    {
      title: 'Health & Education',
      rows: [
        ['School-going Children', String(visit.schoolGoingChildren)],
        ['Nearest School', `${visit.nearestSchoolKm} km`],
        ['Disabled Members', visit.hasDisabledMembers ? 'Yes' : 'No'],
        ['Chronic Illness', visit.hasChronicIllness ? 'Yes' : 'No'],
      ]
    },
  ];

  sections.forEach(section => {
    if (y > H - 30) { pdf.addPage(); y = M; }

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50);
    pdf.text(section.title, M, y);
    pdf.setTextColor(0);
    y += 5;

    pdf.setFontSize(8);
    section.rows.forEach(([label, value]) => {
      if (y > H - 15) { pdf.addPage(); y = M; }
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(label, M + 3, y);
      pdf.setTextColor(0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, M + 52, y);
      y += 4.5;
    });
    y += 3;
  });

  // Notes
  if (visit.notes) {
    if (y > H - 20) { pdf.addPage(); y = M; }
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50);
    pdf.text('Notes', M, y);
    pdf.setTextColor(0);
    y += 5;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const lines = pdf.splitTextToSize(visit.notes, UW - 6);
    pdf.text(lines, M + 3, y);
    y += lines.length * 4;
  }

  return y;
}
