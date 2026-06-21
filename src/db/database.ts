import Dexie, { type Table } from 'dexie';
import type { HouseholdVisit } from '../types/survey';

export class CensusDatabase extends Dexie {
  visits!: Table<HouseholdVisit, string>;

  constructor() {
    super('CensusGeoTaggerDB');

    // Use &id for explicit unique primary key (not auto-generated)
    this.version(1).stores({
      visits: '&id, householdId, createdAt, visitStatus, surveyorName, ward',
    });
  }
}

export const db = new CensusDatabase();

// Database helper functions
export async function addVisit(visit: HouseholdVisit): Promise<string> {
  // Ensure id is set
  if (!visit.id) {
    throw new Error('Visit must have an id');
  }
  const key = await db.visits.put(visit); // use put() instead of add() for reliability
  return key;
}

export async function updateVisit(id: string, changes: Partial<HouseholdVisit>): Promise<number> {
  return await db.visits.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteVisit(id: string): Promise<void> {
  await db.visits.delete(id);
}

export async function getVisit(id: string): Promise<HouseholdVisit | undefined> {
  return await db.visits.get(id);
}

export async function getAllVisits(): Promise<HouseholdVisit[]> {
  return await db.visits.orderBy('createdAt').reverse().toArray();
}

export async function getVisitsByStatus(status: string): Promise<HouseholdVisit[]> {
  return await db.visits.where('visitStatus').equals(status).toArray();
}

export async function getVisitCount(): Promise<number> {
  return await db.visits.count();
}

export async function clearAllVisits(): Promise<void> {
  await db.visits.clear();
}
