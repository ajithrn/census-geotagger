import { useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { getAllVisits, clearAllVisits, db } from '../db/database';
import type { HouseholdVisit } from '../types/survey';

export function SettingsPage() {
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleExportBackup = async () => {
    try {
      const visits = await getAllVisits();
      const backup = {
        version: '1.3.1',
        exportedAt: new Date().toISOString(),
        recordCount: visits.length,
        data: visits,
      };
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `census-backup-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', text: `Backup exported: ${visits.length} records` });
    } catch (err) {
      setStatus({ type: 'error', text: `Export failed: ${err}` });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatus(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !Array.isArray(backup.data)) {
        throw new Error('Invalid backup file format');
      }

      const records: HouseholdVisit[] = backup.data;
      let imported = 0;
      let skipped = 0;

      for (const record of records) {
        if (!record.id || !record.householdId) {
          skipped++;
          continue;
        }
        const existing = await db.visits.get(record.id);
        if (existing) {
          skipped++;
        } else {
          await db.visits.put(record);
          imported++;
        }
      }

      setStatus({ type: 'success', text: `Imported ${imported} records (${skipped} skipped/duplicates)` });
    } catch (err) {
      setStatus({ type: 'error', text: `Import failed: ${err}` });
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleImportReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will REPLACE all current data with the backup. Continue?')) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    setStatus(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !Array.isArray(backup.data)) {
        throw new Error('Invalid backup file format');
      }

      await clearAllVisits();
      const records: HouseholdVisit[] = backup.data;
      for (const record of records) {
        if (record.id && record.householdId) {
          await db.visits.put(record);
        }
      }

      setStatus({ type: 'success', text: `Restored ${records.length} records from backup` });
    } catch (err) {
      setStatus({ type: 'error', text: `Restore failed: ${err}` });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (deleteConfirmText === 'DELETE') {
      await clearAllVisits();
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      setStatus({ type: 'success', text: 'All data cleared' });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-5 space-y-6">
        <h2 className="text-lg font-bold text-gray-800">Settings</h2>
        {/* Status message */}
        {status && (
          <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {status.text}
          </div>
        )}

        {/* Backup Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-800">Data Backup</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Export all survey records as a JSON backup file. You can restore from this file later.
          </p>
          <button
            onClick={handleExportBackup}
            className="w-full p-3.5 border border-gray-200 rounded-lg bg-white text-left active:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <Download size={18} className="text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Export Backup</p>
              <p className="text-xs text-gray-500">Save all records as JSON file</p>
            </div>
          </button>
        </div>

        {/* Import Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Upload size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-800">Import Data</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Import records from a backup file. Choose merge to keep existing data or replace to overwrite.
          </p>
          <div className="space-y-2">
            <label className="w-full p-3.5 border border-gray-200 rounded-lg bg-white active:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer">
              <Upload size={18} className="text-slate-600" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {importing ? 'Importing...' : 'Import & Merge'}
                </p>
                <p className="text-xs text-gray-500">Add records, skip duplicates</p>
              </div>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" disabled={importing} />
            </label>

            <label className="w-full p-3.5 border border-amber-200 rounded-lg bg-amber-50 active:bg-amber-100 transition-colors flex items-center gap-3 cursor-pointer">
              <Upload size={18} className="text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {importing ? 'Importing...' : 'Import & Replace'}
                </p>
                <p className="text-xs text-amber-600">Clear current data, restore from backup</p>
              </div>
              <input type="file" accept=".json" onChange={handleImportReplace} className="hidden" disabled={importing} />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={16} className="text-red-500" />
            <h3 className="text-sm font-bold text-red-800">Danger Zone</h3>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-600 mb-3">
              Permanently delete all survey records. This cannot be undone. Export a backup first.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-xs font-semibold text-white bg-red-600 border border-red-700 rounded-lg active:bg-red-700 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Delete All Data
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-white rounded-xl w-[90%] max-w-sm p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Delete All Data?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Type <span className="font-mono font-bold text-gray-800">DELETE</span> to confirm:
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
                  onClick={handleClearAll}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold bg-red-600 text-white active:bg-red-700 disabled:opacity-30 text-sm"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
