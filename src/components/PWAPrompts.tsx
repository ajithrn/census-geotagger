import { useState } from 'react';
import { RefreshCw, Download, WifiOff, X, Loader2 } from 'lucide-react';

interface UpdateBannerProps {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (dismissed) return null;

  const handleUpdate = () => {
    setUpdating(true);
    onUpdate();
    // If reload doesn't happen in 5s, stop spinner
    setTimeout(() => setUpdating(false), 5000);
  };

  return (
    <div className="fixed top-3 left-3 right-3 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 border border-slate-700">
      <div className="flex items-center gap-2.5 min-w-0">
        {updating ? (
          <Loader2 size={16} className="flex-shrink-0 text-emerald-400 animate-spin" />
        ) : (
          <RefreshCw size={16} className="flex-shrink-0 text-emerald-400" />
        )}
        <p className="text-sm truncate">
          {updating ? 'Updating...' : 'A new version is available'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!updating && (
          <>
            <button
              onClick={handleUpdate}
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
          </>
        )}
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
    <div className="fixed bottom-20 left-3 right-3 z-50 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-300 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Install Census GeoTagger</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Add to home screen for quick access and offline use
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
          className="flex-1 py-2.5 px-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200 transition-colors border border-gray-200"
        >
          Not now
        </button>
        <button
          onClick={onInstall}
          className="flex-1 py-2.5 px-3 text-sm font-semibold text-white bg-slate-800 rounded-lg active:bg-slate-900 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  return (
    <div className="fixed top-3 left-3 right-3 z-50 bg-amber-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 border border-amber-500">
      <WifiOff size={14} />
      <p className="text-xs font-medium">You're offline — data is saved locally</p>
    </div>
  );
}
