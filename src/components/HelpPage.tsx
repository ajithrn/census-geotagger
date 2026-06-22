import { useState } from 'react';
import { ChevronDown, MapPin, ClipboardList, Map, Download, Shield, Smartphone, HelpCircle } from 'lucide-react';

type Section = {
  id: string;
  icon: React.ReactNode;
  title: string;
  items: { q: string; a: string }[];
};

const sections: Section[] = [
  {
    id: 'getting-started',
    icon: <Smartphone size={16} />,
    title: 'Getting Started',
    items: [
      {
        q: 'How do I install the app?',
        a: 'When you first open the app, you\'ll see an "Install" prompt after a few seconds. Tap Install to add it to your home screen. On Android Chrome, you can also tap the three-dot menu → "Add to Home Screen". On iPhone Safari, tap the share button → "Add to Home Screen".',
      },
      {
        q: 'Do I need internet to use this app?',
        a: 'Only for the first load and to view map tiles in new areas. After that, everything works offline — recording visits, viewing records, and exporting data. GPS also works without internet.',
      },
      {
        q: 'How do I set up my profile?',
        a: 'Tap the More button (three dots) at the bottom → Profile. Enter your surveyor name, default ward, language, and organization. These will auto-fill in every new survey.',
      },
    ],
  },
  {
    id: 'survey',
    icon: <ClipboardList size={16} />,
    title: 'Recording Visits',
    items: [
      {
        q: 'How do I start a new survey?',
        a: 'Tap the Survey tab. You\'ll see Step 1: Location. Tap "Capture GPS Location", then fill in the address and other details. Use Next to move through all 6 steps, then tap Save Visit.',
      },
      {
        q: 'What does GPS accuracy mean?',
        a: 'The accuracy number shows how precise your location reading is. Under 10m is excellent, 10-30m is good. If it\'s over 30m, move to an open area away from buildings and try again.',
      },
      {
        q: 'How are total members calculated?',
        a: 'Total members is automatically calculated by adding Males + Females. Just set those two numbers using the +/- buttons.',
      },
      {
        q: 'What do the visit statuses mean?',
        a: 'Completed = you collected all info. Partial = some info is missing (you\'ll add later). Revisit Needed = you need to go back (no one home, etc).',
      },
      {
        q: 'Can I edit a saved visit?',
        a: 'Yes. Go to the Records tab, tap the record to expand it, then tap Edit. Make your changes and tap Update Visit.',
      },
    ],
  },
  {
    id: 'map',
    icon: <Map size={16} />,
    title: 'Map View',
    items: [
      {
        q: 'What do the pin colors mean?',
        a: 'Green = Completed, Orange/Amber = Partial, Red = Revisit Needed. Each pin has a number that matches the Records list.',
      },
      {
        q: 'Why do some pins look rotated?',
        a: 'When multiple visits are at the same location, pins rotate their legs outward so you can see all of them. The tip of each leg points to the exact GPS coordinate.',
      },
      {
        q: 'How do I go fullscreen?',
        a: 'Tap the expand button in the top-right corner of the map. Tap it again or press back to exit fullscreen.',
      },
      {
        q: 'Map tiles aren\'t loading in some areas',
        a: 'You need internet to load map tiles for areas you haven\'t viewed before. Browse the area on the Map tab while connected to WiFi — this caches the tiles for offline use.',
      },
    ],
  },
  {
    id: 'export',
    icon: <Download size={16} />,
    title: 'Exporting Data',
    items: [
      {
        q: 'What export formats are available?',
        a: 'CSV (for Excel/Google Sheets), GeoJSON (for GIS software like QGIS), PDF (full report with map, stats, and details), and Map Image (high-res PNG).',
      },
      {
        q: 'The exported map has gray areas',
        a: 'View the Map tab first before exporting. This caches the map tiles. The export uses the same tiles your map already loaded — if you haven\'t viewed that area, tiles won\'t be available.',
      },
      {
        q: 'How do I share the PDF?',
        a: 'After exporting, the file downloads to your phone. You can share it via WhatsApp, email, Google Drive, or any sharing method your phone supports.',
      },
    ],
  },
  {
    id: 'backup',
    icon: <Shield size={16} />,
    title: 'Backup & Data',
    items: [
      {
        q: 'How do I back up my data?',
        a: 'Tap More → Settings → Export Backup. This saves all records as a JSON file. Keep this file safe — in Google Drive, email it to yourself, or save to cloud storage.',
      },
      {
        q: 'How do I restore from a backup?',
        a: 'Tap More → Settings → choose either "Import & Merge" (adds records, skips duplicates) or "Import & Replace" (clears everything first, then restores).',
      },
      {
        q: 'Where is my data stored?',
        a: 'All data stays on your device only. Nothing is sent to any server. The only way data leaves your phone is when you manually export or back up.',
      },
      {
        q: 'What happens if I clear browser data?',
        a: 'All survey records will be lost. Always export a backup before clearing data. If you installed the app, clearing browser data may still affect it.',
      },
      {
        q: 'How often should I back up?',
        a: 'After every field session, or whenever you have 5+ new records. Also back up before app updates or clearing browser data.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    icon: <HelpCircle size={16} />,
    title: 'Troubleshooting',
    items: [
      {
        q: 'GPS is not accurate',
        a: 'Move to an open area away from tall buildings. Wait 10-15 seconds after tapping capture. GPS works best outdoors with a clear sky view.',
      },
      {
        q: 'The app says "update available"',
        a: 'Tap Update to get the latest version. Your data is never affected by updates.',
      },
      {
        q: 'Can two people use the same phone?',
        a: 'Yes. Change the surveyor name in Profile or per visit. All records are in one database — you can filter by surveyor in the Records search.',
      },
      {
        q: 'How many records can I store?',
        a: 'Thousands. There\'s no practical limit. If your phone is low on storage, export a backup and clear old records from Settings.',
      },
    ],
  },
];

export function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>('getting-started');
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto pb-20 bg-white">
      <div className="p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Help & Guide</h2>
        <p className="text-xs text-gray-500 mb-5">Tap a topic to expand, then tap a question to see the answer.</p>

        <div className="space-y-2">
          {sections.map(section => (
            <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                className="w-full px-4 py-3 flex items-center gap-3 bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="text-slate-600">{section.icon}</span>
                <span className="flex-1 text-sm font-semibold text-gray-800 text-left">{section.title}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${openSection === section.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Questions */}
              {openSection === section.id && (
                <div className="divide-y divide-gray-100">
                  {section.items.map((item, idx) => {
                    const itemId = `${section.id}-${idx}`;
                    return (
                      <div key={idx}>
                        <button
                          onClick={() => setOpenItem(openItem === itemId ? null : itemId)}
                          className="w-full px-4 py-3 text-left active:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700 font-medium">{item.q}</span>
                          </div>
                        </button>
                        {openItem === itemId && (
                          <div className="px-4 pb-3 pl-9">
                            <p className="text-xs text-gray-600 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
