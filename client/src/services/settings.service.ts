import { apiClient, unwrap } from './apiClient';
import { BackupInfo, Settings } from '@/types';

export const settingsApi = {
  get: () => unwrap<Settings>(apiClient.get('/settings')),
  update: (input: Partial<Settings>) => unwrap<Settings>(apiClient.put('/settings', input)),
  listBackups: () => unwrap<BackupInfo[]>(apiClient.get('/settings/backups')),
  createBackup: () => unwrap<BackupInfo>(apiClient.post('/settings/backups')),
  restoreBackup: (fileName: string) =>
    unwrap<{ restored: boolean }>(apiClient.post('/settings/backups/restore', { fileName })),
  masterReset: (confirmation: string) =>
    unwrap<{ reset: boolean }>(apiClient.post('/settings/master-reset', { confirmation })),
};
