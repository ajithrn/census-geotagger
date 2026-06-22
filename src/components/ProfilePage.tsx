import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { LANGUAGES } from '../types/survey';

export interface AppSettings {
  surveyorName: string;
  defaultWard: string;
  defaultLanguage: string;
  organizationName: string;
}

const SETTINGS_KEY = 'cgt-settings';

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { surveyorName: '', defaultWard: '', defaultLanguage: '', organizationName: '' };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface ProfilePageProps {
  onBack?: () => void;
}

export function ProfilePage(_props: ProfilePageProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Form */}
      <div className="p-5 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">Profile</h2>
        <p className="text-xs text-gray-500 -mt-3">
          These values will be pre-filled in new survey forms. You can still change them per visit.
        </p>

        <SettingsInput
          label="Surveyor Name"
          value={settings.surveyorName}
          onChange={v => updateField('surveyorName', v)}
          placeholder="Your full name"
        />

        <SettingsInput
          label="Default Ward / Area"
          value={settings.defaultWard}
          onChange={v => updateField('defaultWard', v)}
          placeholder="e.g. Ward 5, Sector B"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Language</label>
          <select
            value={settings.defaultLanguage}
            onChange={e => updateField('defaultLanguage', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-white"
          >
            <option value="">Select language</option>
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <SettingsInput
          label="Organization / Department"
          value={settings.organizationName}
          onChange={v => updateField('organizationName', v)}
          placeholder="e.g. Municipal Corporation"
        />

        <button
          onClick={handleSave}
          className="w-full py-3 px-4 rounded-lg font-semibold bg-slate-800 text-white active:bg-slate-900 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Profile'}
        </button>

        {saved && (
          <p className="text-center text-xs text-emerald-600 font-medium">
            Profile saved. New surveys will use these defaults.
          </p>
        )}
      </div>
    </div>
  );
}

function SettingsInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors placeholder:text-gray-400"
      />
    </div>
  );
}
