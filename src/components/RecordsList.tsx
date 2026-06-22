import { useEffect, useState } from 'react';
import {
  Search, ChevronDown, Trash2, Pencil,
  MapPin, Phone, User, Home, Briefcase, Crosshair,
  Droplets, Zap, Bath, GraduationCap, HeartPulse,
  Languages, Users, Accessibility,
} from 'lucide-react';
import { getAllVisits, deleteVisit } from '../db/database';
import type { HouseholdVisit } from '../types/survey';
import {
  VISIT_STATUS_LABELS,
  MARKER_COLORS,
  HOUSEHOLD_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  OCCUPATION_LABELS,
  INCOME_LABELS,
  WATER_SOURCE_LABELS,
  RATION_CARD_LABELS,
} from '../types/survey';

interface RecordsListProps {
  refreshTrigger: number;
  onRefresh: () => void;
  onEdit?: (visit: HouseholdVisit) => void;
}

export function RecordsList({ refreshTrigger, onRefresh, onEdit }: RecordsListProps) {
  const [visits, setVisits] = useState<HouseholdVisit[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadVisits = async () => {
    const data = await getAllVisits();
    setVisits(data);
  };

  useEffect(() => {
    loadVisits(); // eslint-disable-line react-hooks/set-state-in-effect -- loading data from IndexedDB on mount/refresh
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this visit record? This cannot be undone.')) {
      await deleteVisit(id);
      onRefresh();
    }
  };

  const filteredVisits = visits.filter(v =>
    v.headName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.householdId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.ward.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Records</h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold">
            {visits.length} visits
          </span>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search name, ID, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-2">
        {filteredVisits.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Home size={20} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">
              {visits.length === 0 ? 'No records yet' : 'No matching records'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {visits.length === 0 ? 'Complete a survey to see records here' : 'Try a different search'}
            </p>
          </div>
        ) : (
          filteredVisits.map((visit, index) => (
            <div
              key={visit.id}
              className="rounded-lg bg-white border border-gray-200 overflow-hidden"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expandedId === visit.id ? null : visit.id)}
                className="w-full p-3.5 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
              >
                {/* Numbered pin */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: MARKER_COLORS[visit.visitStatus] }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{visit.headName}</p>
                  <p className="text-xs text-gray-500 truncate">{visit.address}{visit.ward ? ` \u2022 ${visit.ward}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0 mr-1">
                  <p className="text-[10px] font-mono text-gray-400">{visit.householdId}</p>
                  <p className="text-[10px] text-gray-400">{new Date(visit.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-400">{new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${expandedId === visit.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded — full data */}
              {expandedId === visit.id && (
                <div className="px-3.5 pb-3.5 border-t border-gray-100 bg-gray-50/50">
                  {/* Location */}
                  <SectionHeader title="Location" />
                  <div className="grid grid-cols-2 gap-2">
                    <DetailItem icon={<MapPin size={12} />} label="Address" value={visit.address} />
                    <DetailItem icon={<MapPin size={12} />} label="Landmark" value={visit.landmark || '—'} />
                    <DetailItem icon={<MapPin size={12} />} label="Ward" value={visit.ward || '—'} />
                    <DetailItem icon={<Crosshair size={12} />} label="GPS" value={`${visit.geoLocation.latitude.toFixed(5)}, ${visit.geoLocation.longitude.toFixed(5)}`} />
                    <DetailItem icon={<Crosshair size={12} />} label="Accuracy" value={`\u00B1${visit.geoLocation.accuracy.toFixed(0)}m`} />
                    <DetailItem icon={<Phone size={12} />} label="Phone" value={visit.headPhone || '—'} />
                  </div>

                  {/* Demographics */}
                  <SectionHeader title="Demographics" />
                  <div className="grid grid-cols-2 gap-2">
                    <DetailItem icon={<Users size={12} />} label="Total Members" value={String(visit.totalMembers)} />
                    <DetailItem icon={<User size={12} />} label="Males" value={String(visit.totalMales)} />
                    <DetailItem icon={<User size={12} />} label="Females" value={String(visit.totalFemales)} />
                    <DetailItem icon={<User size={12} />} label="Children (<18)" value={String(visit.childrenUnder18)} />
                    <DetailItem icon={<User size={12} />} label="Seniors (60+)" value={String(visit.seniorCitizens)} />
                    <DetailItem icon={<Languages size={12} />} label="Language" value={visit.primaryLanguage || '—'} />
                  </div>

                  {/* Housing */}
                  <SectionHeader title="Housing" />
                  <div className="grid grid-cols-2 gap-2">
                    <DetailItem icon={<Home size={12} />} label="Ownership" value={HOUSEHOLD_TYPE_LABELS[visit.householdType]} />
                    <DetailItem icon={<Home size={12} />} label="Structure" value={STRUCTURE_TYPE_LABELS[visit.structureType]} />
                    <DetailItem icon={<Droplets size={12} />} label="Water" value={WATER_SOURCE_LABELS[visit.waterSource]} />
                    <DetailItem icon={<Zap size={12} />} label="Electricity" value={visit.hasElectricity ? 'Yes' : 'No'} />
                    <DetailItem icon={<Bath size={12} />} label="Toilet" value={visit.hasToilet ? 'Yes' : 'No'} />
                  </div>

                  {/* Economy */}
                  <SectionHeader title="Socioeconomic" />
                  <div className="grid grid-cols-2 gap-2">
                    <DetailItem icon={<Briefcase size={12} />} label="Occupation" value={OCCUPATION_LABELS[visit.primaryOccupation]} />
                    <DetailItem icon={<Briefcase size={12} />} label="Income" value={INCOME_LABELS[visit.incomeRange]} />
                    <DetailItem icon={<Briefcase size={12} />} label="Ration Card" value={RATION_CARD_LABELS[visit.rationCardType]} />
                  </div>

                  {/* Health */}
                  <SectionHeader title="Health & Education" />
                  <div className="grid grid-cols-2 gap-2">
                    <DetailItem icon={<GraduationCap size={12} />} label="School Children" value={String(visit.schoolGoingChildren)} />
                    <DetailItem icon={<GraduationCap size={12} />} label="School Distance" value={`${visit.nearestSchoolKm} km`} />
                    <DetailItem icon={<Accessibility size={12} />} label="Disabled" value={visit.hasDisabledMembers ? 'Yes' : 'No'} />
                    <DetailItem icon={<HeartPulse size={12} />} label="Chronic Illness" value={visit.hasChronicIllness ? 'Yes' : 'No'} />
                  </div>

                  {/* Visit info */}
                  <SectionHeader title="Visit Info" />
                  <div className="grid grid-cols-2 gap-2">
                    <DetailItem icon={<User size={12} />} label="Surveyor" value={visit.surveyorName} />
                    <DetailItem icon={<MapPin size={12} />} label="Status" value={VISIT_STATUS_LABELS[visit.visitStatus]} />
                  </div>

                  {visit.notes && (
                    <p className="mt-2.5 text-xs text-gray-600 bg-white p-2.5 rounded-md border border-gray-100">
                      {visit.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(visit)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md active:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(visit.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md active:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-3 mb-1.5">{title}</p>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-md p-2 border border-gray-100">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xs font-medium text-gray-700 truncate">{value}</p>
    </div>
  );
}
