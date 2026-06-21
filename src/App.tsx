import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, Map, List, Download, Info } from 'lucide-react';
import { SurveyForm } from './components/SurveyForm';
import { MapView } from './components/MapView';
import { RecordsList } from './components/RecordsList';
import { ExportPanel } from './components/ExportPanel';
import { AboutPage } from './components/AboutPage';
import { UpdateBanner, InstallPrompt, OfflineIndicator } from './components/PWAPrompts';
import { usePWA } from './hooks/usePWA';

type Tab = 'form' | 'map' | 'records' | 'export' | 'about';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [installDismissed, setInstallDismissed] = useState(false);

  const {
    needsUpdate,
    updateServiceWorker,
    canInstall,
    isInstalled,
    promptInstall,
    isOffline,
  } = usePWA();

  const showInstallPrompt = canInstall && !isInstalled && !installDismissed;

  const handleDismissInstall = useCallback(() => {
    setInstallDismissed(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Show install prompt after a short delay (don't interrupt immediately)
  const [installReady, setInstallReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setInstallReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-dvh w-full flex flex-col items-center justify-center bg-gray-100">
      {/* Mobile frame */}
      <div className="h-full w-full md:max-w-[420px] md:h-[85dvh] md:max-h-[900px] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 md:overflow-hidden flex flex-col bg-white relative z-10">
        {/* PWA prompts */}
        {isOffline && <OfflineIndicator />}
        {needsUpdate && <UpdateBanner onUpdate={updateServiceWorker} />}
        {showInstallPrompt && installReady && (
          <InstallPrompt onInstall={promptInstall} onDismiss={handleDismissInstall} />
        )}

        {/* Header */}
        <header className={`bg-slate-900 text-white px-4 py-3 flex-shrink-0 ${isOffline || needsUpdate ? 'mt-9' : ''}`}>
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Census GeoTagger" className="w-8 h-8 rounded-lg ring-1 ring-slate-600" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">Census GeoTagger</h1>
              <p className="text-[11px] text-slate-400">Field Survey & Geolocation Logger</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'form' && <SurveyForm onSaved={handleRefresh} />}
          {activeTab === 'map' && <MapView refreshTrigger={refreshTrigger} />}
          {activeTab === 'records' && (
            <RecordsList refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          )}
          {activeTab === 'export' && <ExportPanel refreshTrigger={refreshTrigger} />}
          {activeTab === 'about' && <AboutPage />}
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex">
            <TabButton active={activeTab === 'form'} onClick={() => setActiveTab('form')} icon={<ClipboardList size={18} />} label="Survey" />
            <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<Map size={18} />} label="Map" />
            <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')} icon={<List size={18} />} label="Records" />
            <TabButton active={activeTab === 'export'} onClick={() => setActiveTab('export')} icon={<Download size={18} />} label="Export" />
            <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info size={18} />} label="About" />
          </div>
        </nav>
      </div>

      {/* Desktop footer */}
      <footer className="hidden md:flex items-center justify-center gap-4 text-xs text-gray-400 fixed bottom-4 left-0 right-0 z-10">
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
