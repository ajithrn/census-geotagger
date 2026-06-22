import { Settings, Info, ChevronRight, X, UserCircle, HelpCircle } from 'lucide-react';

interface MoreMenuProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: 'profile' | 'settings' | 'help' | 'about') => void;
}

export function MoreMenu({ open, onClose, onNavigate }: MoreMenuProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 z-40" onClick={onClose} />
      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.1)] border-t border-gray-200 px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">More</h3>
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2">
          <MenuButton
            icon={<UserCircle size={18} />}
            title="Profile"
            desc="Surveyor name, ward, organization"
            onClick={() => { onClose(); onNavigate('profile'); }}
          />
          <MenuButton
            icon={<Settings size={18} />}
            title="Settings"
            desc="Backup, import, data management"
            onClick={() => { onClose(); onNavigate('settings'); }}
          />
          <MenuButton
            icon={<HelpCircle size={18} />}
            title="Help"
            desc="How to use, FAQ, troubleshooting"
            onClick={() => { onClose(); onNavigate('help'); }}
          />
          <MenuButton
            icon={<Info size={18} />}
            title="About"
            desc="Privacy, disclaimer, credits"
            onClick={() => { onClose(); onNavigate('about'); }}
          />
        </div>
      </div>
    </>
  );
}

function MenuButton({ icon, title, desc, onClick }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3.5 border border-gray-200 rounded-lg bg-white text-left active:bg-gray-50 transition-colors flex items-center gap-3"
    >
      <span className="text-slate-600">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </button>
  );
}
