import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MapPin, Navigation, User, Phone, Languages, Users,
  Home, Key, Landmark, Building2, Layers,
  Droplets, Zap, Bath,
  Wheat, Store, Briefcase, Hammer, FileText,
  GraduationCap, HeartPulse, Accessibility,
  CheckCircle2, Clock, RotateCcw, Save, Loader2,
  ChevronLeft, ChevronRight, Check, Minus, Plus,
  MapPinned, AlertCircle,
} from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { addVisit } from '../db/database';
import { getSettings } from './ProfilePage';
import type { HouseholdVisit, SurveyFormData } from '../types/survey';
import {
  MARKER_COLORS,
  HOUSEHOLD_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  OCCUPATION_LABELS,
  INCOME_LABELS,
  WATER_SOURCE_LABELS,
  RATION_CARD_LABELS,
  VISIT_STATUS_LABELS,
} from '../types/survey';

const STEPS = [
  { id: 0, title: 'Location', desc: 'GPS & Address' },
  { id: 1, title: 'Household', desc: 'Head & Members' },
  { id: 2, title: 'Housing', desc: 'Type & Facilities' },
  { id: 3, title: 'Economy', desc: 'Income & Work' },
  { id: 4, title: 'Health', desc: 'Health & Education' },
  { id: 5, title: 'Review', desc: 'Confirm & Save' },
];

const initialFormData: SurveyFormData = {
  geoLocation: { latitude: 0, longitude: 0, accuracy: 0, timestamp: 0 },
  address: '',
  landmark: '',
  ward: '',
  headName: '',
  headPhone: '',
  totalMembers: 1,
  totalMales: 0,
  totalFemales: 0,
  childrenUnder18: 0,
  seniorCitizens: 0,
  primaryLanguage: '',
  householdType: 'owned',
  structureType: 'pucca',
  primaryOccupation: 'agriculture',
  incomeRange: 'below-5000',
  hasElectricity: true,
  waterSource: 'tap',
  hasToilet: true,
  rationCardType: 'none',
  schoolGoingChildren: 0,
  nearestSchoolKm: 1,
  hasDisabledMembers: false,
  hasChronicIllness: false,
  surveyorName: '',
  visitStatus: 'completed',
  notes: '',
};

interface SurveyFormProps {
  onSaved: () => void;
  editingVisit?: HouseholdVisit | null;
  onEditComplete?: () => void;
  onNavigate?: (tab: string) => void;
}

export function SurveyForm({ onSaved, editingVisit, onEditComplete, onNavigate }: SurveyFormProps) {
  const settings = getSettings();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<SurveyFormData>({
    ...initialFormData,
    surveyorName: settings.surveyorName,
    ward: settings.defaultWard,
    primaryLanguage: settings.defaultLanguage,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editHouseholdId, setEditHouseholdId] = useState<string | null>(null);
  const [editCreatedAt, setEditCreatedAt] = useState<number | null>(null);
  const { loading: geoLoading, error: geoError, getCurrentPosition } = useGeolocation();

  // Load editing visit data when prop changes
  useEffect(() => {
    if (editingVisit) {
      const { id, householdId, createdAt, updatedAt: _u, markerColor: _m, ...rest } = editingVisit;
      setFormData(rest);
      setEditId(id);
      setEditHouseholdId(householdId);
      setEditCreatedAt(createdAt);
      setStep(0);
      setMessage(null);
    }
  }, [editingVisit?.id, editingVisit?.updatedAt]);

  const updateField = <K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleGetLocation = async () => {
    try {
      const loc = await getCurrentPosition();
      updateField('geoLocation', loc);
    } catch {
      // Error handled by hook
    }
  };

  const nextStep = () => {
    if (step === 0) {
      if (formData.geoLocation.latitude === 0 && formData.geoLocation.longitude === 0) {
        setMessage({ type: 'error', text: 'Please capture GPS location first' });
        return;
      }
      if (!formData.address.trim()) {
        setMessage({ type: 'error', text: 'Please enter an address' });
        return;
      }
    }
    if (step === 1 && !formData.headName.trim()) {
      setMessage({ type: 'error', text: 'Head of household name is required' });
      return;
    }
    setMessage(null);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setMessage(null);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!formData.surveyorName.trim()) {
      setMessage({ type: 'error', text: 'Please enter surveyor name' });
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      if (editId) {
        // Update existing record
        const visit: HouseholdVisit = {
          id: editId,
          householdId: editHouseholdId!,
          createdAt: editCreatedAt!,
          updatedAt: now,
          ...formData,
          markerColor: MARKER_COLORS[formData.visitStatus],
        };
        await addVisit(visit); // put() handles upsert
        setMessage({ type: 'success', text: `Updated! ID: ${visit.householdId}` });
        setEditId(null);
        setEditHouseholdId(null);
        setEditCreatedAt(null);
        setFormData({ ...initialFormData, surveyorName: formData.surveyorName, ward: settings.defaultWard, primaryLanguage: settings.defaultLanguage });
        onSaved();
        onEditComplete?.();
        setTimeout(() => { setStep(0); setMessage(null); onNavigate?.('records'); }, 1500);
      } else {
        // Create new record
        const visit: HouseholdVisit = {
          id: uuidv4(),
          householdId: `HH-${Date.now().toString(36).toUpperCase()}`,
          createdAt: now,
          updatedAt: now,
          ...formData,
          markerColor: MARKER_COLORS[formData.visitStatus],
        };
        await addVisit(visit);
        setMessage({ type: 'success', text: `Saved successfully! ID: ${visit.householdId}` });
        setFormData({ ...initialFormData, surveyorName: formData.surveyorName, ward: settings.defaultWard, primaryLanguage: settings.defaultLanguage });
        onSaved();
        setTimeout(() => { setStep(0); setMessage(null); onNavigate?.('records'); }, 1500);
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Error saving: ${err}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Step header */}
      <div className="px-4 pt-3 pb-3 flex-shrink-0 bg-gray-50 border-b border-gray-200">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              {editId ? 'Edit Visit' : 'New Visit'}
            </h2>
            <p className="text-[11px] text-gray-500">
              Step {step + 1} of {STEPS.length}: {STEPS[step].title}
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
            {STEPS[step].desc}
          </span>
        </div>
        {/* Progress dots */}
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i <= step ? setStep(i) : undefined}
                aria-label={`Step ${i + 1}: ${s.title}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors flex-shrink-0 ${
                  i < step ? 'bg-emerald-600 text-white' :
                  i === step ? 'bg-slate-800 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}
              >
                {i < step ? <Check size={11} /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-[2px] mx-1 rounded-full ${i < step ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-3 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {message.text}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 0 && <StepLocation formData={formData} updateField={updateField} geoLoading={geoLoading} geoError={geoError} onGetLocation={handleGetLocation} />}
        {step === 1 && <StepHousehold formData={formData} updateField={updateField} />}
        {step === 2 && <StepHousing formData={formData} updateField={updateField} />}
        {step === 3 && <StepEconomy formData={formData} updateField={updateField} />}
        {step === 4 && <StepHealth formData={formData} updateField={updateField} />}
        {step === 5 && <StepReview formData={formData} updateField={updateField} />}
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              className="flex-1 py-3 px-4 rounded-lg font-semibold bg-slate-800 text-white active:bg-slate-900 transition-colors flex items-center justify-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-3 px-4 rounded-lg font-semibold bg-emerald-700 text-white active:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> {editId ? 'Update Visit' : 'Save Visit'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// === STEP COMPONENTS ===

interface StepProps {
  formData: SurveyFormData;
  updateField: <K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) => void;
}

function StepLocation({ formData, updateField, geoLoading, geoError, onGetLocation }: StepProps & {
  geoLoading: boolean; geoError: string | null; onGetLocation: () => void;
}) {
  const hasLocation = formData.geoLocation.latitude !== 0;

  return (
    <div className="space-y-4">
      {/* GPS capture */}
      <div className={`p-4 rounded-lg border-2 transition-colors ${
        hasLocation ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'
      }`}>
        <button
          type="button"
          onClick={onGetLocation}
          disabled={geoLoading}
          className={`w-full py-3.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            geoLoading
              ? 'bg-gray-200 text-gray-500 cursor-wait'
              : hasLocation
                ? 'bg-emerald-700 text-white active:bg-emerald-800'
                : 'bg-slate-800 text-white active:bg-slate-900'
          }`}
        >
          {geoLoading ? (
            <><Loader2 size={18} className="animate-spin" /> Getting Location...</>
          ) : hasLocation ? (
            <><MapPinned size={18} /> Location Captured &mdash; Tap to Recapture</>
          ) : (
            <><Navigation size={18} /> Capture GPS Location</>
          )}
        </button>
        {geoError && (
          <p className="text-red-700 text-sm mt-2 flex items-center gap-1.5">
            <AlertCircle size={14} /> {geoError}
          </p>
        )}
        {hasLocation && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="Latitude" value={formData.geoLocation.latitude.toFixed(5)} />
            <MiniStat label="Longitude" value={formData.geoLocation.longitude.toFixed(5)} />
            <MiniStat label="Accuracy" value={`\u00B1${formData.geoLocation.accuracy.toFixed(0)}m`} />
          </div>
        )}
      </div>

      <FormInput icon={<MapPin size={16} />} label="Address / Door Number" value={formData.address} onChange={v => updateField('address', v)} required placeholder="e.g. 12/4, Main Road" />
      <FormInput icon={<Landmark size={16} />} label="Landmark" value={formData.landmark} onChange={v => updateField('landmark', v)} placeholder="e.g. Near Temple, Opposite School" />
      <FormInput icon={<Building2 size={16} />} label="Ward / Area" value={formData.ward} onChange={v => updateField('ward', v)} placeholder="e.g. Ward 5, Sector B" />
    </div>
  );
}

function StepHousehold({ formData, updateField }: StepProps) {
  const totalMembers = formData.totalMales + formData.totalFemales;

  return (
    <div className="space-y-4">
      <FormInput icon={<User size={16} />} label="Head of Household (Full Name)" value={formData.headName} onChange={v => updateField('headName', v)} required placeholder="Full name" />
      <FormInput icon={<Phone size={16} />} label="Phone Number" value={formData.headPhone} onChange={v => updateField('headPhone', v)} type="tel" placeholder="Mobile number" />
      <FormInput icon={<Languages size={16} />} label="Primary Language" value={formData.primaryLanguage} onChange={v => updateField('primaryLanguage', v)} placeholder="e.g. Hindi, Tamil" />

      <div className="pt-2">
        <SectionLabel icon={<Users size={15} />} text="Family Members" />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <NumberStepper label="Males" value={formData.totalMales} onChange={v => { updateField('totalMales', v); updateField('totalMembers', v + formData.totalFemales); }} min={0} />
          <NumberStepper label="Females" value={formData.totalFemales} onChange={v => { updateField('totalFemales', v); updateField('totalMembers', formData.totalMales + v); }} min={0} />
          <NumberStepper label="Children (<18)" value={formData.childrenUnder18} onChange={v => updateField('childrenUnder18', v)} min={0} />
          <NumberStepper label="Seniors (60+)" value={formData.seniorCitizens} onChange={v => updateField('seniorCitizens', v)} min={0} />
        </div>
        {/* Auto-calculated total */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Total Members</span>
          <span className="text-lg font-bold text-gray-800 tabular-nums">{totalMembers || formData.totalMembers}</span>
        </div>
      </div>
    </div>
  );
}

function StepHousing({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel icon={<Home size={15} />} text="Ownership Type" />
        <CardSelect
          options={HOUSEHOLD_TYPE_LABELS}
          value={formData.householdType}
          onChange={v => updateField('householdType', v)}
          icons={{ owned: <Home size={18} />, rented: <Key size={18} />, government: <Building2 size={18} />, other: <FileText size={18} /> }}
        />
      </div>

      <div>
        <SectionLabel icon={<Layers size={15} />} text="Structure Type" />
        <CardSelect
          options={STRUCTURE_TYPE_LABELS}
          value={formData.structureType}
          onChange={v => updateField('structureType', v)}
          icons={{ pucca: <Building2 size={18} />, 'semi-pucca': <Layers size={18} />, kutcha: <Home size={18} /> }}
        />
      </div>

      <div>
        <SectionLabel icon={<Droplets size={15} />} text="Water Source" />
        <CardSelect
          options={WATER_SOURCE_LABELS}
          value={formData.waterSource}
          onChange={v => updateField('waterSource', v)}
          icons={{ tap: <Droplets size={18} />, well: <Droplets size={18} />, borewell: <Droplets size={18} />, river: <Droplets size={18} />, other: <Droplets size={18} /> }}
        />
      </div>

      <div>
        <SectionLabel icon={<Zap size={15} />} text="Facilities" />
        <div className="space-y-2 mt-3">
          <ToggleCard icon={<Zap size={18} />} label="Has Electricity" active={formData.hasElectricity} onToggle={v => updateField('hasElectricity', v)} />
          <ToggleCard icon={<Bath size={18} />} label="Has Toilet / Latrine" active={formData.hasToilet} onToggle={v => updateField('hasToilet', v)} />
        </div>
      </div>
    </div>
  );
}

function StepEconomy({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel icon={<Briefcase size={15} />} text="Main Occupation" />
        <CardSelect
          options={OCCUPATION_LABELS}
          value={formData.primaryOccupation}
          onChange={v => updateField('primaryOccupation', v)}
          icons={{ agriculture: <Wheat size={18} />, business: <Store size={18} />, service: <Briefcase size={18} />, labour: <Hammer size={18} />, other: <FileText size={18} /> }}
        />
      </div>

      <div>
        <SectionLabel icon={<Briefcase size={15} />} text="Monthly Income (approx.)" />
        <CardSelect
          options={INCOME_LABELS}
          value={formData.incomeRange}
          onChange={v => updateField('incomeRange', v)}
          columns={1}
        />
      </div>

      <div>
        <SectionLabel icon={<FileText size={15} />} text="Ration Card" />
        <CardSelect
          options={RATION_CARD_LABELS}
          value={formData.rationCardType}
          onChange={v => updateField('rationCardType', v)}
        />
      </div>
    </div>
  );
}

function StepHealth({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel icon={<GraduationCap size={15} />} text="Education" />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <NumberStepper label="School-going Children" value={formData.schoolGoingChildren} onChange={v => updateField('schoolGoingChildren', v)} min={0} />
          <NumberStepper label="Nearest School (km)" value={formData.nearestSchoolKm} onChange={v => updateField('nearestSchoolKm', v)} min={0} step={0.5} />
        </div>
      </div>

      <div>
        <SectionLabel icon={<HeartPulse size={15} />} text="Health Conditions" />
        <div className="space-y-2 mt-3">
          <ToggleCard icon={<Accessibility size={18} />} label="Any Disabled Members" active={formData.hasDisabledMembers} onToggle={v => updateField('hasDisabledMembers', v)} />
          <ToggleCard icon={<HeartPulse size={18} />} label="Any Chronic Illness" active={formData.hasChronicIllness} onToggle={v => updateField('hasChronicIllness', v)} />
        </div>
      </div>
    </div>
  );
}

function StepReview({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <FormInput icon={<User size={16} />} label="Surveyor Name" value={formData.surveyorName} onChange={v => updateField('surveyorName', v)} required placeholder="Your name" />

      <div>
        <SectionLabel icon={<CheckCircle2 size={15} />} text="Visit Status" />
        <CardSelect
          options={VISIT_STATUS_LABELS}
          value={formData.visitStatus}
          onChange={v => updateField('visitStatus', v)}
          icons={{ completed: <CheckCircle2 size={18} />, partial: <Clock size={18} />, revisit: <RotateCcw size={18} /> }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes / Remarks</label>
        <textarea
          value={formData.notes}
          onChange={e => updateField('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors resize-none"
          placeholder="Any additional observations..."
        />
      </div>

      {/* Full Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-700 mb-3">Review All Data</p>
        <div className="space-y-1.5 text-xs text-gray-600">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold pt-1">Location</p>
          <SummaryRow icon={<MapPin size={12} />} label="Address" value={formData.address || '—'} />
          <SummaryRow icon={<Landmark size={12} />} label="Landmark" value={formData.landmark || '—'} />
          <SummaryRow icon={<Building2 size={12} />} label="Ward" value={formData.ward || '—'} />
          <SummaryRow icon={<MapPinned size={12} />} label="GPS" value={formData.geoLocation.latitude !== 0 ? `${formData.geoLocation.latitude.toFixed(5)}, ${formData.geoLocation.longitude.toFixed(5)}` : '—'} />

          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold pt-2">Household</p>
          <SummaryRow icon={<User size={12} />} label="Head" value={formData.headName || '—'} />
          <SummaryRow icon={<Phone size={12} />} label="Phone" value={formData.headPhone || '—'} />
          <SummaryRow icon={<Languages size={12} />} label="Language" value={formData.primaryLanguage || '—'} />
          <SummaryRow icon={<Users size={12} />} label="Members" value={`${formData.totalMembers} (M:${formData.totalMales} F:${formData.totalFemales})`} />
          <SummaryRow icon={<Users size={12} />} label="Children/Seniors" value={`${formData.childrenUnder18} / ${formData.seniorCitizens}`} />

          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold pt-2">Housing</p>
          <SummaryRow icon={<Home size={12} />} label="Type" value={HOUSEHOLD_TYPE_LABELS[formData.householdType]} />
          <SummaryRow icon={<Layers size={12} />} label="Structure" value={STRUCTURE_TYPE_LABELS[formData.structureType]} />
          <SummaryRow icon={<Droplets size={12} />} label="Water" value={WATER_SOURCE_LABELS[formData.waterSource]} />
          <SummaryRow icon={<Zap size={12} />} label="Electricity" value={formData.hasElectricity ? 'Yes' : 'No'} />
          <SummaryRow icon={<Bath size={12} />} label="Toilet" value={formData.hasToilet ? 'Yes' : 'No'} />

          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold pt-2">Economy</p>
          <SummaryRow icon={<Briefcase size={12} />} label="Occupation" value={OCCUPATION_LABELS[formData.primaryOccupation]} />
          <SummaryRow icon={<Briefcase size={12} />} label="Income" value={INCOME_LABELS[formData.incomeRange]} />
          <SummaryRow icon={<FileText size={12} />} label="Ration Card" value={RATION_CARD_LABELS[formData.rationCardType]} />

          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold pt-2">Health & Education</p>
          <SummaryRow icon={<GraduationCap size={12} />} label="School Children" value={String(formData.schoolGoingChildren)} />
          <SummaryRow icon={<GraduationCap size={12} />} label="School Dist." value={`${formData.nearestSchoolKm} km`} />
          <SummaryRow icon={<Accessibility size={12} />} label="Disabled" value={formData.hasDisabledMembers ? 'Yes' : 'No'} />
          <SummaryRow icon={<HeartPulse size={12} />} label="Chronic Illness" value={formData.hasChronicIllness ? 'Yes' : 'No'} />
        </div>
      </div>
    </div>
  );
}

// === REUSABLE UI COMPONENTS ===

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-500">{icon}</span>
      <span className="text-sm font-semibold text-gray-700">{text}</span>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 w-20">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function CardSelect<T extends string>({ options, value, onChange, icons, columns = 2 }: {
  options: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
  icons?: Record<string, React.ReactNode>;
  columns?: number;
}) {
  return (
    <div className={`grid gap-2 mt-2 ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {Object.entries(options).map(([key, label]) => {
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key as T)}
            className={`relative p-3 rounded-lg border text-left transition-colors ${
              isSelected
                ? 'border-slate-700 bg-slate-50 ring-1 ring-slate-700'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {icons && icons[key] && (
                <span className={isSelected ? 'text-slate-700' : 'text-gray-400'}>
                  {icons[key]}
                </span>
              )}
              <span className={`text-sm font-medium ${isSelected ? 'text-slate-800' : 'text-gray-600'}`}>
                {label as string}
              </span>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ToggleCard({ icon, label, active, onToggle }: {
  icon: React.ReactNode; label: string; active: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={`w-full p-3.5 rounded-lg border flex items-center justify-between transition-colors ${
        active
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={active ? 'text-emerald-700' : 'text-gray-400'}>{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div
        role="switch"
        aria-checked={active}
        className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
          active ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </div>
    </button>
  );
}

function NumberStepper({ label, value, onChange, min = 0, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-white">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Decrease ${label}`}
          className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors"
        >
          <Minus size={16} />
        </button>
        <span className="text-lg font-bold text-gray-800 min-w-[3ch] text-center tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          aria-label={`Increase ${label}`}
          className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function FormInput({ icon, label, value, onChange, type = 'text', required, placeholder }: {
  icon: React.ReactNode; label: string; value: string | number; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 bg-white rounded-md border border-gray-100">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-xs font-semibold text-gray-800 font-mono">{value}</p>
    </div>
  );
}
