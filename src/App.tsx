import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, Map, List, Download, MoreHorizontal } from 'lucide-react';
import { SurveyForm } from './components/SurveyForm';
import { MapView } from './components/MapView';
import { RecordsList } from './components/RecordsList';
import { ExportPanel } from './components/ExportPanel';
import { AboutPage } from './components/AboutPage';
import { SettingsPage } from './components/SettingsPage';
import { MoreMenu } from './components/MorePage';
import { UpdateBanner, InstallPrompt, OfflineIndicator } from './components/PWAPrompts';
import { usePWA } from './hooks/usePWA';

type Tab = 'form' | 'map' | 'records' | 'export' | 'settings' | 'about';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [editingVisit, setEditingVisit] = useState<import('./types/survey').HouseholdVisit | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const { needsUpdate, updateServiceWorker, canInstall, isInstalled, promptInstall, isOffline } = usePWA();
  const showInstallPrompt = canInstall && !isInstalled && !installDismissed;

  const handleDismissInstall = useCallback(() => setInstallDismissed(true), []);
  const handleRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);
  const handleEdit = useCallback((visit: import('./types/survey').HouseholdVisit) => {
    setEditingVisit(visit);
    setActiveTab('form');
  }, []);
  const handleEditComplete = useCallback(() => setEditingVisit(null), []);

  const [installReady, setInstallReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setInstallReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const isMainTab = !['settings', 'about'].includes(activeTab);

  return (
    <div className="h-dvh w-full flex flex-col items-center justify-center bg-gray-100 fixed inset-0">
      {/* PWA floating notifications — truly fixed, outside everything */}
      {isOffline && <OfflineIndicator />}
      {needsUpdate && <UpdateBanner onUpdate={updateServiceWorker} />}
      {showInstallPrompt && installReady && (
        <InstallPrompt onInstall={promptInstall} onDismiss={handleDismissInstall} />
      )}

      {/* Mobile frame */}
      <div className="h-full w-full md:max-w-[420px] md:h-[85dvh] md:max-h-[900px] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 md:overflow-hidden flex flex-col bg-white relative">
        {/* Header — always visible */}
        <header className="bg-slate-900 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Census GeoTagger" className="w-8 h-8 rounded-lg ring-1 ring-slate-600" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">Census GeoTagger</h1>
              <p className="text-[11px] text-slate-400">Field Survey & Geolocation Logger</p>
            </div>
          </div>
        </header>

        {/* Sub-page header for Settings/About */}
        {!isMainTab && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center flex-shrink-0">
            <button
              onClick={() => setActiveTab('form')}
              className="text-sm font-medium text-slate-600 active:text-slate-900"
            >
              ← Back
            </button>
            <span className="flex-1 text-center text-sm font-bold text-gray-800">
              {activeTab === 'settings' ? 'Settings' : 'About'}
            </span>
            <span className="w-10" />
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'form' && <SurveyForm onSaved={handleRefresh} editingVisit={editingVisit} onEditComplete={handleEditComplete} onNavigate={(tab) => setActiveTab(tab as Tab)} />}
          {activeTab === 'map' && <MapView refreshTrigger={refreshTrigger} />}
          {activeTab === 'records' && (
            <RecordsList refreshTrigger={refreshTrigger} onRefresh={handleRefresh} onEdit={handleEdit} />
          )}
          {activeTab === 'export' && <ExportPanel refreshTrigger={refreshTrigger} />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'about' && <AboutPage />}

          {/* More bottom sheet — inside main so it sits above nav naturally */}
          <MoreMenu
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            onNavigate={(page) => { setActiveTab(page); setMoreOpen(false); }}
          />
        </main>

        {/* Bottom Navigation — always visible */}
        <nav className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex">
            <TabButton active={activeTab === 'form'} onClick={() => { setActiveTab('form'); setMoreOpen(false); }} icon={<ClipboardList size={18} />} label="Survey" />
            <TabButton active={activeTab === 'map'} onClick={() => { setActiveTab('map'); setMoreOpen(false); }} icon={<Map size={18} />} label="Map" />
            <TabButton active={activeTab === 'records'} onClick={() => { setActiveTab('records'); setMoreOpen(false); }} icon={<List size={18} />} label="Records" />
            <TabButton active={activeTab === 'export'} onClick={() => { setActiveTab('export'); setMoreOpen(false); }} icon={<Download size={18} />} label="Export" />
            <TabButton active={moreOpen || !isMainTab} onClick={() => setMoreOpen(!moreOpen)} icon={<MoreHorizontal size={18} />} label="More" />
          </div>
        </nav>
      </div>

      {/* Desktop footer */}
      <footer className="hidden md:flex items-center justify-center gap-4 text-xs text-gray-400 fixed bottom-4 left-0 right-0">
        <button onClick={() => setActiveTab('about')} className="hover:text-gray-600 transition-colors">Privacy & Disclaimer</button>
        <span className="text-gray-300">·</span>
        <a href="https://github.com/ajithrn/census-geotagger" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">GitHub</a>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center py-2 px-1 transition-colors ${
        active ? 'text-slate-800' : 'text-gray-400'
      }`}
    >
      {icon}
      <span className={`text-[10px] font-medium mt-0.5 ${active ? 'text-slate-800' : 'text-gray-400'}`}>{label}</span>
      {active && <div className="w-4 h-0.5 bg-slate-800 rounded-full mt-0.5" />}
    </button>
  );
}

export default App;
