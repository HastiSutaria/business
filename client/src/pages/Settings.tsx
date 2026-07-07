import { useEffect, useState } from 'react';
import { AlertTriangle, DatabaseBackup, Download, RotateCcw } from 'lucide-react';
import {
  useBackupsQuery,
  useCreateBackup,
  useMasterReset,
  useRestoreBackup,
  useSettingsQuery,
  useUpdateSettings,
} from '@/hooks/useSettings';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDateTime } from '@/utils/format';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage(): JSX.Element {
  const { data: settings } = useSettingsQuery();
  const updateSettings = useUpdateSettings();
  const { data: backups } = useBackupsQuery();
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const masterReset = useMasterReset();
  const { setTheme } = useTheme();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<string | undefined>(undefined);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName);
      setOwnerName(settings.ownerName);
    }
  }, [settings]);

  const handleSaveProfile = (): void => {
    updateSettings.mutate({ businessName, ownerName });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400">Business profile, appearance, backup & danger zone</p>
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Business Profile</h3>
        <div>
          <label className="label">Business Name</label>
          <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div>
          <label className="label">Owner Name</label>
          <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <button className="btn-primary self-start" onClick={handleSaveProfile} disabled={updateSettings.isPending}>
          Save Profile
        </button>
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Appearance</h3>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setTheme(mode);
                updateSettings.mutate({ theme: mode });
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium border capitalize ${
                settings?.theme === mode
                  ? 'bg-gold-500 border-gold-500 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DatabaseBackup size={16} /> Backup & Restore
          </h3>
          <button className="btn-secondary" onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
            Create Backup
          </button>
        </div>
        {settings?.lastBackupAt && (
          <p className="text-xs text-gray-400">Last backup: {formatDateTime(settings.lastBackupAt)}</p>
        )}
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
          {!backups || backups.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No backups yet.</p>
          ) : (
            backups.map((b) => (
              <div key={b.fileName} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{b.fileName}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(b.createdAt)}</p>
                </div>
                <button
                  className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                  onClick={() => setRestoreTarget(b.fileName)}
                >
                  <Download size={12} /> Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-3 border-2 border-loss/30">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-loss">
          <AlertTriangle size={16} /> Danger Zone
        </h3>
        <p className="text-sm text-gray-500">
          "Clear Entire Business" permanently deletes all transactions, settlements, ledger and statistics history.
          Your client list will be preserved. This action cannot be undone.
        </p>
        <button className="btn-danger self-start" onClick={() => setResetOpen(true)}>
          <RotateCcw size={14} /> Clear Entire Business
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore Backup"
        message={`This will overwrite all current data with the backup "${restoreTarget}". Continue?`}
        confirmLabel="Restore"
        danger
        loading={restoreBackup.isPending}
        onCancel={() => setRestoreTarget(undefined)}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreBackup.mutate(restoreTarget, { onSuccess: () => setRestoreTarget(undefined) });
        }}
      />

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResetOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl p-5 animate-slide-up">
            <h2 className="text-base font-semibold text-loss mb-2">Confirm Master Reset</h2>
            <p className="text-sm text-gray-500 mb-3">
              Type <span className="font-mono font-bold">RESET</span> below to permanently clear all trading data.
            </p>
            <input
              className="input mb-4"
              placeholder="Type RESET"
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setResetOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-danger flex-1"
                disabled={resetConfirmation !== 'RESET' || masterReset.isPending}
                onClick={() => {
                  masterReset.mutate(resetConfirmation, {
                    onSuccess: () => {
                      setResetOpen(false);
                      setResetConfirmation('');
                    },
                  });
                }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
