import { useState } from 'react';
import { RefreshCw, Download, WifiOff, X } from 'lucide-react';

interface UpdateBannerProps {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-800 text-white px-4 py-3 shadow-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <RefreshCw size={16} className="flex-shrink-0 text-emerald-400" />
        <p className="text-sm truncate">A new version is available</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onUpdate}
          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md active:bg-emerald-700 transition-colors"
        >
          Update
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="p-1 text-slate-400 active:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

interface InstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPrompt({ onInstall, onDismiss }: InstallPromptProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-slate-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Install Census GeoTagger</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Add to your home screen for quick access and offline use
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="p-1 text-gray-400 active:text-gray-600 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onDismiss}
          className="flex-1 py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200 transition-colors"
        >
          Not now
        </button>
        <button
          onClick={onInstall}
          className="flex-1 py-2 px-3 text-sm font-semibold text-white bg-slate-800 rounded-lg active:bg-slate-900 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff size={14} />
      <p className="text-xs font-medium">You're offline — data is saved locally</p>
    </div>
  );
}
