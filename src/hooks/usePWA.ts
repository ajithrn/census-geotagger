import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  needsUpdate: boolean;
  updateServiceWorker: () => void;
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => void;
  isOffline: boolean;
}

export function usePWA(): PWAState {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandalone;
  });
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
      // Register immediately on load
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
        registrationRef.current = registration;
        console.log('SW registered successfully');

        // If there's already a waiting worker on load, prompt immediately
        if (registration.waiting) {
          setNeedsUpdate(true);
        }

        // Listen for new installing workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // New SW is installed and waiting, existing SW is controlling the page
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setNeedsUpdate(true);
            }
          });
        });

        // Check for updates periodically (every 60 min)
        const intervalId = setInterval(() => registration.update(), 60 * 60 * 1000);
        intervalRef.current = intervalId;
      }).catch(err => {
        // SW not available in dev mode — this is expected
        console.log('SW registration unavailable:', err.message);
      });

      // Reload page when new SW takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // --- Install Prompt ---
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPromptEvent(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // --- Network Status ---
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      setInstallPromptEvent(null);
    }
  }, [installPromptEvent]);

  return {
    needsUpdate,
    updateServiceWorker,
    canInstall,
    isInstalled,
    promptInstall,
    isOffline,
  };
}
