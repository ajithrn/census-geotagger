import Papa from 'papaparse';
import type { HouseholdVisit } from '../types/survey';

export function exportToCsv(visits: HouseholdVisit[], filename: string = 'census-data'): void {
  const flatData = visits.map(visit => ({
    'Household ID': visit.householdId,
    'Head of Household': visit.headName,
    'Phone': visit.headPhone,
    'Address': visit.address,
    'Landmark': visit.landmark,
    'Ward': visit.ward,
    'Latitude': visit.geoLocation.latitude,
    'Longitude': visit.geoLocation.longitude,
    'GPS Accuracy (m)': visit.geoLocation.accuracy.toFixed(1),
    'Total Members': visit.totalMembers,
    'Males': visit.totalMales,
    'Females': visit.totalFemales,
    'Children (<18)': visit.childrenUnder18,
    'Senior Citizens (60+)': visit.seniorCitizens,
    'Primary Language': visit.primaryLanguage,
    'Household Type': visit.householdType,
    'Structure Type': visit.structureType,
    'Occupation': visit.primaryOccupation,
    'Income Range': visit.incomeRange,
    'Electricity': visit.hasElectricity ? 'Yes' : 'No',
    'Water Source': visit.waterSource,
    'Toilet': visit.hasToilet ? 'Yes' : 'No',
    'Ration Card': visit.rationCardType,
    'School-going Children': visit.schoolGoingChildren,
    'Nearest School (km)': visit.nearestSchoolKm,
    'Disabled Members': visit.hasDisabledMembers ? 'Yes' : 'No',
    'Chronic Illness': visit.hasChronicIllness ? 'Yes' : 'No',
    'Surveyor': visit.surveyorName,
    'Visit Status': visit.visitStatus,
    'Notes': visit.notes,
    'Visit Date': new Date(visit.createdAt).toLocaleString(),
  }));

  const csv = Papa.unparse(flatData);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToGeoJson(visits: HouseholdVisit[], filename: string = 'census-data'): void {
  const geojson = {
    type: 'FeatureCollection' as const,
    features: visits.map(visit => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [visit.geoLocation.longitude, visit.geoLocation.latitude],
      },
      properties: {
        householdId: visit.householdId,
        headName: visit.headName,
        address: visit.address,
        ward: visit.ward,
        totalMembers: visit.totalMembers,
        householdType: visit.householdType,
        structureType: visit.structureType,
        occupation: visit.primaryOccupation,
        incomeRange: visit.incomeRange,
        visitStatus: visit.visitStatus,
        surveyorName: visit.surveyorName,
        visitDate: new Date(visit.createdAt).toISOString(),
        notes: visit.notes,
      },
    })),
  };

  const json = JSON.stringify(geojson, null, 2);
  downloadFile(json, `${filename}.geojson`, 'application/geo+json');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
