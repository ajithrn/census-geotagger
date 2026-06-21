import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { HouseholdVisit } from '../types/survey';
import {
  MARKER_COLORS,
  VISIT_STATUS_LABELS,
  HOUSEHOLD_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  OCCUPATION_LABELS,
  INCOME_LABELS,
} from '../types/survey';

export async function exportToPdf(
  visits: HouseholdVisit[],
  mapElement: HTMLElement | null,
  filename: string = 'census-report'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Census GeoTagger Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report metadata
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  pdf.text(`Total Visits: ${visits.length}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Map snapshot
  if (mapElement) {
    try {
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = 100;
      const finalHeight = Math.min(imgHeight, maxImgHeight);

      pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, finalHeight);
      yPos += finalHeight + 10;
    } catch {
      pdf.setFontSize(9);
      pdf.text('(Map snapshot could not be captured)', margin, yPos);
      yPos += 8;
    }
  }

  // Legend
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Legend', margin, yPos);
  yPos += 7;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  Object.entries(MARKER_COLORS).forEach(([status, color]) => {
    pdf.setFillColor(color);
    pdf.circle(margin + 3, yPos - 1.5, 2, 'F');
    pdf.text(
      `${VISIT_STATUS_LABELS[status as keyof typeof VISIT_STATUS_LABELS]} (${visits.filter(v => v.visitStatus === status).length})`,
      margin + 8,
      yPos
    );
    yPos += 5;
  });
  yPos += 5;

  // Summary Statistics
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary Statistics', margin, yPos);
  yPos += 7;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');

  const totalPopulation = visits.reduce((sum, v) => sum + v.totalMembers, 0);
  const totalMales = visits.reduce((sum, v) => sum + v.totalMales, 0);
  const totalFemales = visits.reduce((sum, v) => sum + v.totalFemales, 0);
  const withElectricity = visits.filter(v => v.hasElectricity).length;
  const withToilet = visits.filter(v => v.hasToilet).length;

  const stats = [
    `Total Households Surveyed: ${visits.length}`,
    `Total Population: ${totalPopulation} (Male: ${totalMales}, Female: ${totalFemales})`,
    `Households with Electricity: ${withElectricity} (${((withElectricity / visits.length) * 100).toFixed(1)}%)`,
    `Households with Toilet: ${withToilet} (${((withToilet / visits.length) * 100).toFixed(1)}%)`,
  ];

  stats.forEach(stat => {
    pdf.text(stat, margin, yPos);
    yPos += 5;
  });
  yPos += 8;

  // Household Details Table
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Household Details', margin, yPos);
  yPos += 7;

  // Table header
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  const colWidths = [20, 30, 25, 20, 20, 20, 20, 25];
  const headers = ['ID', 'Head Name', 'Address', 'Members', 'Type', 'Structure', 'Occupation', 'Status'];

  let xPos = margin;
  headers.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 1;
  pdf.setDrawColor(0);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  visits.forEach(visit => {
    if (yPos > pageHeight - 20) {
      pdf.addPage();
      yPos = margin;
    }

    xPos = margin;
    const rowData = [
      visit.householdId.slice(0, 8),
      visit.headName.slice(0, 15),
      visit.address.slice(0, 12),
      String(visit.totalMembers),
      HOUSEHOLD_TYPE_LABELS[visit.householdType].slice(0, 10),
      STRUCTURE_TYPE_LABELS[visit.structureType].slice(0, 10),
      OCCUPATION_LABELS[visit.primaryOccupation].slice(0, 10),
      VISIT_STATUS_LABELS[visit.visitStatus],
    ];

    rowData.forEach((cell, i) => {
      pdf.text(cell, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 4;
  });

  // Add detailed pages for each visit
  visits.forEach((visit, index) => {
    pdf.addPage();
    yPos = margin;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Household ${index + 1}: ${visit.headName}`, margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const details = [
      ['Household ID', visit.householdId],
      ['Address', visit.address],
      ['Landmark', visit.landmark],
      ['Ward', visit.ward],
      ['GPS', `${visit.geoLocation.latitude.toFixed(6)}, ${visit.geoLocation.longitude.toFixed(6)} (±${visit.geoLocation.accuracy.toFixed(0)}m)`],
      ['Phone', visit.headPhone],
      ['', ''],
      ['Total Members', String(visit.totalMembers)],
      ['Males / Females', `${visit.totalMales} / ${visit.totalFemales}`],
      ['Children (<18)', String(visit.childrenUnder18)],
      ['Senior Citizens (60+)', String(visit.seniorCitizens)],
      ['Primary Language', visit.primaryLanguage],
      ['', ''],
      ['Household Type', HOUSEHOLD_TYPE_LABELS[visit.householdType]],
      ['Structure Type', STRUCTURE_TYPE_LABELS[visit.structureType]],
      ['Occupation', OCCUPATION_LABELS[visit.primaryOccupation]],
      ['Income Range', INCOME_LABELS[visit.incomeRange]],
      ['Electricity', visit.hasElectricity ? 'Yes' : 'No'],
      ['Water Source', visit.waterSource],
      ['Toilet', visit.hasToilet ? 'Yes' : 'No'],
      ['Ration Card', visit.rationCardType.toUpperCase()],
      ['', ''],
      ['School-going Children', String(visit.schoolGoingChildren)],
      ['Nearest School', `${visit.nearestSchoolKm} km`],
      ['Disabled Members', visit.hasDisabledMembers ? 'Yes' : 'No'],
      ['Chronic Illness', visit.hasChronicIllness ? 'Yes' : 'No'],
      ['', ''],
      ['Surveyor', visit.surveyorName],
      ['Visit Status', VISIT_STATUS_LABELS[visit.visitStatus]],
      ['Visit Date', new Date(visit.createdAt).toLocaleString()],
      ['Notes', visit.notes || 'N/A'],
    ];

    details.forEach(([label, value]) => {
      if (label === '' && value === '') {
        yPos += 3;
        return;
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, margin + 45, yPos);
      yPos += 5;
    });
  });

  pdf.save(`${filename}.pdf`);
}
