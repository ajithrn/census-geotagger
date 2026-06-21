import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, Map, List, Download } from 'lucide-react';
import { SurveyForm } from './components/SurveyForm';
import { MapView } from './components/MapView';
import { RecordsList } from './components/RecordsList';
import { ExportPanel } from './components/ExportPanel';
import { UpdateBanner, InstallPrompt, OfflineIndicator } from './components/PWAPrompts';
import { usePWA } from './hooks/usePWA';

type Tab = 'form' | 'map' | 'records' | 'export';

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

  // Don't show install prompt again this session if dismissed
  const showInstallPrompt = canInstall && !isInstalled && !installDismissed;

  // Persist install dismissal for this session
  const handleDismissInstall = useCallback(() => {
    setInstallDismissed(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Show install prompt after 30s delay (don't interrupt initial use)
  const [installReady, setInstallReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setInstallReady(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-dvh flex flex-col bg-white">
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
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex">
          <TabButton active={activeTab === 'form'} onClick={() => setActiveTab('form')} icon={<ClipboardList size={20} />} label="Survey" />
          <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<Map size={20} />} label="Map" />
          <TabButton active={activeTab === 'records'} onClick={() => setActiveTab('records')} icon={<List size={20} />} label="Records" />
          <TabButton active={activeTab === 'export'} onClick={() => setActiveTab('export')} icon={<Download size={20} />} label="Export" />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center py-2.5 px-1 transition-colors ${
        active ? 'text-slate-800' : 'text-gray-400'
      }`}
    >
      {icon}
      <span className={`text-[10px] font-medium mt-1 ${active ? 'text-slate-800' : 'text-gray-400'}`}>{label}</span>
      {active && <div className="w-5 h-0.5 bg-slate-800 rounded-full mt-1" />}
    </button>
  );
}

export default App;
