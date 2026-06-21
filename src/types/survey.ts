export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type HouseholdType = 'owned' | 'rented' | 'government' | 'other';
export type StructureType = 'pucca' | 'semi-pucca' | 'kutcha';
export type OccupationType = 'agriculture' | 'business' | 'service' | 'labour' | 'other';
export type IncomeRange = 'below-5000' | '5000-10000' | '10000-25000' | '25000-50000' | 'above-50000';
export type WaterSource = 'tap' | 'well' | 'borewell' | 'river' | 'other';
export type RationCardType = 'bpl' | 'apl' | 'aay' | 'none';
export type VisitStatus = 'completed' | 'partial' | 'revisit';

export interface HouseholdVisit {
  id: string;
  householdId: string;
  createdAt: number;
  updatedAt: number;

  // Location
  geoLocation: GeoLocation;
  address: string;
  landmark: string;
  ward: string;

  // Head of Household
  headName: string;
  headPhone: string;

  // Household Info
  totalMembers: number;
  totalMales: number;
  totalFemales: number;
  childrenUnder18: number;
  seniorCitizens: number;
  primaryLanguage: string;
  householdType: HouseholdType;
  structureType: StructureType;

  // Socioeconomic
  primaryOccupation: OccupationType;
  incomeRange: IncomeRange;
  hasElectricity: boolean;
  waterSource: WaterSource;
  hasToilet: boolean;
  rationCardType: RationCardType;

  // Health & Education
  schoolGoingChildren: number;
  nearestSchoolKm: number;
  hasDisabledMembers: boolean;
  hasChronicIllness: boolean;

  // Visit Metadata
  surveyorName: string;
  visitStatus: VisitStatus;
  notes: string;

  // Color coding for map
  markerColor: string;
}

export interface SurveyFormData extends Omit<HouseholdVisit, 'id' | 'householdId' | 'createdAt' | 'updatedAt' | 'markerColor'> {}

export const MARKER_COLORS_ICONS: Record<VisitStatus, { color: string; icon: string }> = {
  completed: { color: '#22c55e', icon: '✓' },
  partial: { color: '#f59e0b', icon: '◐' },
  revisit: { color: '#ef4444', icon: '↻' },
};

export const MARKER_COLORS: Record<VisitStatus, string> = {
  completed: '#16a34a',  // green-600 (4.5:1 on white)
  partial: '#d97706',    // amber-600 (3.0:1 — used only as indicator, not text)
  revisit: '#dc2626',    // red-600 (4.0:1)
};

export const HOUSEHOLD_TYPE_LABELS: Record<HouseholdType, string> = {
  owned: 'Owned',
  rented: 'Rented',
  government: 'Government Quarters',
  other: 'Other',
};

export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  pucca: 'Pucca (Permanent)',
  'semi-pucca': 'Semi-Pucca',
  kutcha: 'Kutcha (Temporary)',
};

export const OCCUPATION_LABELS: Record<OccupationType, string> = {
  agriculture: 'Agriculture',
  business: 'Business',
  service: 'Service/Salaried',
  labour: 'Daily Labour',
  other: 'Other',
};

export const INCOME_LABELS: Record<IncomeRange, string> = {
  'below-5000': 'Below ₹5,000',
  '5000-10000': '₹5,000 - ₹10,000',
  '10000-25000': '₹10,000 - ₹25,000',
  '25000-50000': '₹25,000 - ₹50,000',
  'above-50000': 'Above ₹50,000',
};

export const WATER_SOURCE_LABELS: Record<WaterSource, string> = {
  tap: 'Piped/Tap Water',
  well: 'Well',
  borewell: 'Borewell',
  river: 'River/Pond',
  other: 'Other',
};

export const RATION_CARD_LABELS: Record<RationCardType, string> = {
  bpl: 'BPL (Below Poverty Line)',
  apl: 'APL (Above Poverty Line)',
  aay: 'AAY (Antyodaya)',
  none: 'None',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  completed: 'Completed',
  partial: 'Partial',
  revisit: 'Revisit Needed',
};
