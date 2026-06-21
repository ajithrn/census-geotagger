import { X, Code2, ExternalLink, Mail } from 'lucide-react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">About Census GeoTagger</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* App info */}
          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              An offline-first progressive web app for conducting household census surveys
              with GPS geolocation tagging. Built for field workers who need a reliable,
              simple tool that works without internet.
            </p>
            <p className="text-xs text-gray-400 mt-2">Version 1.0.0</p>
          </div>

          {/* Developer */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Developer</h3>
            <a
              href="https://ajithrn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">Ajith R N</p>
                <p className="text-xs text-gray-500">ajithrn.com</p>
              </div>
              <ExternalLink size={14} className="text-gray-400" />
            </a>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Support</h3>
            <div className="space-y-2">
              <a
                href="https://buymeacoffee.com/ajithrn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FFDD00] text-gray-900 rounded-lg font-semibold text-sm active:brightness-95 transition-all"
              >
                <img src="/assets/bmc-logo-no-background.png" alt="" className="h-5 w-5 object-contain" />
                Buy Me a Coffee
              </a>
              <a
                href="mailto:dev@ajithrn.com"
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm active:bg-gray-50 transition-colors"
              >
                <Mail size={15} />
                dev@ajithrn.com
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Source</h3>
            <a
              href="https://github.com/ajithrn/census-geotagger"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
            >
              <Code2 size={16} /> GitHub Repository
              <ExternalLink size={12} className="text-gray-400" />
            </a>
          </div>

          {/* License */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Open source under the MIT License. Map data &copy; OpenStreetMap contributors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
