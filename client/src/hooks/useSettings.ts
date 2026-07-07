import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/settings.service';
import { ApiRequestError } from '@/services/apiClient';
import { useToast } from '@/contexts/ToastContext';
import { Settings } from '@/types';

const settingsKey = ['settings'] as const;
const backupsKey = ['settings', 'backups'] as const;

export function useSettingsQuery() {
  return useQuery({ queryKey: settingsKey, queryFn: () => settingsApi.get() });
}

export function useBackupsQuery() {
  return useQuery({ queryKey: backupsKey, queryFn: () => settingsApi.listBackups() });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (input: Partial<Settings>) => settingsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKey });
      showToast('Settings saved', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: () => settingsApi.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupsKey });
      queryClient.invalidateQueries({ queryKey: settingsKey });
      showToast('Backup created successfully', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (fileName: string) => settingsApi.restoreBackup(fileName),
    onSuccess: () => {
      queryClient.invalidateQueries();
      showToast('Backup restored successfully', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useMasterReset() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (confirmation: string) => settingsApi.masterReset(confirmation),
    onSuccess: () => {
      queryClient.invalidateQueries();
      showToast('Business data reset. Clients preserved.', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}
