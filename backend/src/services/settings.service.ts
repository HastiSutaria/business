import { DEFAULT_SETTINGS, settingsStore } from '../database/repositories';
import { Settings } from '../types';

function stripUserId<T extends { userId: string }>(record: T): Omit<T, 'userId'> {
  const { userId: _userId, ...rest } = record;
  return rest;
}

export async function getSettingsForUser(userId: string): Promise<Settings> {
  const all = await settingsStore.read();
  const existing = all.find((s) => s.userId === userId);
  return existing ? stripUserId(existing) : { ...DEFAULT_SETTINGS };
}

export async function updateSettingsForUser(userId: string, patch: Partial<Settings>): Promise<Settings> {
  const updated = await settingsStore.update((current) => {
    const index = current.findIndex((s) => s.userId === userId);
    if (index === -1) {
      return [...current, { ...DEFAULT_SETTINGS, ...patch, userId }];
    }
    const next = [...current];
    next[index] = { ...next[index], ...patch };
    return next;
  });
  return stripUserId(updated.find((s) => s.userId === userId)!);
}

export async function setLastBackupAt(userId: string, lastBackupAt: string): Promise<void> {
  await updateSettingsForUser(userId, { lastBackupAt });
}
