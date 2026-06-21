import { useEffect, useState } from 'react';
import {
  FileSpreadsheet, Globe, FileText, Trash2, Loader2,
  Users, Home, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { getAllVisits } from '../db/database';
import { exportToCsv, exportToGeoJson } from '../utils/exportCsv';
import { exportToPdf } from '../utils/exportPdf';
import type { HouseholdVisit } from '../types/survey';
import { VISIT_STATUS_LABELS, MARKER_COLORS } from '../types/survey';

interface ExportPanelProps {
  refreshTrigger: number;
}

export function ExportPanel({ refreshTrigger }: ExportPanelProps) {
  const [visits, setVisits] = useState<HouseholdVisit[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadVisits();
  }, [refreshTrigger]);

  const loadVisits = async () => {
    const data = await getAllVisits();
    setVisits(data);
  };

  const handleExportCsv = () => {
    setExporting('csv');
    try {
      exportToCsv(visits, `census-survey-${Date.now()}`);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  const handleExportGeoJson = () => {
    setExporting('geojson');
    try {
      exportToGeoJson(visits, `census-survey-${Date.now()}`);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      await exportToPdf(visits, null, `census-report-${Date.now()}`);
    } finally {
      setTimeout(() => setExporting(null), 2000);
    }
  };

  const completedCount = visits.filter(v => v.visitStatus === 'completed').length;
  const partialCount = visits.filter(v => v.visitStatus === 'partial').length;
  const revisitCount = visits.filter(v => v.visitStatus === 'revisit').length;
  const totalPopulation = visits.reduce((sum, v) => sum + v.totalMembers, 0);

  return (
    <div className="h-full overflow-y-auto p-4 pb-20 bg-white">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Export & Summary</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={<Home size={18} />} label="Total Visits" value={visits.length} />
        <StatCard icon={<Users size={18} />} label="Population" value={totalPopulation} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={completedCount} />
        <StatCard icon={<Clock size={18} />} label="Pending" value={partialCount + revisitCount} />
      </div>

      {/* Status Breakdown */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Breakdown</h3>
        {Object.entries(VISIT_STATUS_LABELS).map(([key, label]) => {
          const count = visits.filter(v => v.visitStatus === key).length;
          const percentage = visits.length > 0 ? (count / visits.length) * 100 : 0;
          return (
            <div key={key} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MARKER_COLORS[key as keyof typeof MARKER_COLORS] }} />
                  {label}
                </span>
                <span className="font-semibold text-gray-700">{count} ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: MARKER_COLORS[key as keyof typeof MARKER_COLORS],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Export */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Export Data</h3>

        <ExportButton
          onClick={handleExportCsv}
          disabled={visits.length === 0 || exporting === 'csv'}
          loading={exporting === 'csv'}
          icon={<FileSpreadsheet size={20} />}
          title="Export as CSV"
          desc="Open in Excel, Google Sheets, or any spreadsheet"
        />
        <ExportButton
          onClick={handleExportGeoJson}
          disabled={visits.length === 0 || exporting === 'geojson'}
          loading={exporting === 'geojson'}
          icon={<Globe size={20} />}
          title="Export as GeoJSON"
          desc="Open in QGIS, MapBox, or any GIS software"
        />
        <ExportButton
          onClick={handleExportPdf}
          disabled={visits.length === 0 || exporting === 'pdf'}
          loading={exporting === 'pdf'}
          icon={<FileText size={20} />}
          title="Export PDF Report"
          desc="Map, legend, stats, and all household details"
        />
      </div>

      {/* Data Management */}
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 size={14} className="text-red-600" />
          <h3 className="text-sm font-semibold text-red-800">Danger Zone</h3>
        </div>
        <p className="text-xs text-red-600 mb-3">
          This will permanently delete all survey records from this device. This action cannot be undone.
          Make sure you have exported your data before proceeding.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-2 text-xs font-semibold text-white bg-red-600 border border-red-700 rounded-lg active:bg-red-700 transition-colors flex items-center gap-1.5"
        >
          <Trash2 size={14} /> Delete All Data
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl w-[90%] max-w-sm p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Delete All Data?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              You are about to permanently delete <span className="font-bold text-red-700">{visits.length} survey records</span> from this device.
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-xs text-red-700 font-medium">
                This action is irreversible. All household visits, GPS data, and survey responses will be lost forever.
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Type <span className="font-mono font-bold text-gray-700">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 active:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText === 'DELETE') {
                    const { clearAllVisits } = await import('../db/database');
                    await clearAllVisits();
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                    loadVisits();
                  }
                }}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold bg-red-600 text-white active:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-500">{icon}</span>
        <span className="text-xl font-bold text-gray-800 tabular-nums">{value}</span>
      </div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

function ExportButton({ onClick, disabled, loading, icon, title, desc }: {
  onClick: () => void; disabled: boolean; loading: boolean;
  icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-3.5 border border-gray-200 rounded-lg bg-white disabled:opacity-40 text-left active:bg-gray-50 transition-colors flex items-center gap-3"
    >
      <span className="text-slate-600">{loading ? <Loader2 size={20} className="animate-spin" /> : icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </button>
  );
}
