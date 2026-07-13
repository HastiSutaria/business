/**
 * Backup, restore and "Master Reset" (danger zone) operations — all scoped to a
 * single tenant. Backups are full snapshots of that tenant's slice of every
 * collection, written under backend/backups/<userId>/<timestamp>.json so one
 * tenant can never list or restore another tenant's backup file.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  clientsStore,
  ledgerStore,
  paymentsStore,
  settingsStore,
  statisticsStore,
  transactionsStore,
} from '../database/repositories';
import { AppError } from '../utils/errors';
import { rebuildAllLedgers } from './ledger.service';
import { getSettingsForUser, updateSettingsForUser } from './settings.service';
import { Client, LedgerEntry, Settings, Settlement, Transaction } from '../types';
import { StatisticsCache } from '../database/repositories';

const BACKUPS_ROOT = path.join(__dirname, '..', '..', 'backups');

interface BackupBundle {
  createdAt: string;
  clients: Client[];
  transactions: Transaction[];
  payments: Settlement[];
  ledger: LedgerEntry[];
  settings: Settings;
  statistics: StatisticsCache | null;
}

function userBackupsDir(userId: string): string {
  const dir = path.join(BACKUPS_ROOT, userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function createBackup(userId: string): Promise<{ fileName: string; createdAt: string }> {
  const [clients, transactions, payments, ledger, settings, allStatistics] = await Promise.all([
    clientsStore.read(),
    transactionsStore.read(),
    paymentsStore.read(),
    ledgerStore.read(),
    getSettingsForUser(userId),
    statisticsStore.read(),
  ]);

  const bundle: BackupBundle = {
    createdAt: new Date().toISOString(),
    clients: clients.filter((c) => c.userId === userId),
    transactions: transactions.filter((t) => t.userId === userId),
    payments: payments.filter((p) => p.userId === userId),
    ledger: ledger.filter((e) => e.userId === userId),
    settings,
    statistics: allStatistics.find((s) => s.userId === userId) ?? null,
  };

  const fileName = `backup-${bundle.createdAt.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(userBackupsDir(userId), fileName), JSON.stringify(bundle, null, 2), 'utf-8');

  await updateSettingsForUser(userId, { lastBackupAt: bundle.createdAt });

  return { fileName, createdAt: bundle.createdAt };
}

export function listBackups(userId: string): Array<{ fileName: string; createdAt: string; sizeBytes: number }> {
  const dir = userBackupsDir(userId);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((fileName) => {
      const stat = fs.statSync(path.join(dir, fileName));
      return { fileName, createdAt: stat.mtime.toISOString(), sizeBytes: stat.size };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreBackup(userId: string, fileName: string): Promise<void> {
  const safeFileName = path.basename(fileName);
  const filePath = path.join(userBackupsDir(userId), safeFileName);
  if (!fs.existsSync(filePath)) {
    throw AppError.notFound('Backup file');
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const bundle = JSON.parse(raw) as BackupBundle;

  const stamp = <T extends { id: string }>(records: T[]): Array<T & { userId: string }> =>
    (records ?? []).map((r) => ({ ...r, userId }));

  await clientsStore.update((current) => [...current.filter((c) => c.userId !== userId), ...stamp(bundle.clients)]);
  await transactionsStore.update((current) => [
    ...current.filter((t) => t.userId !== userId),
    ...stamp(bundle.transactions),
  ]);
  await paymentsStore.update((current) => [
    ...current.filter((p) => p.userId !== userId),
    ...stamp(bundle.payments),
  ]);
  await ledgerStore.update((current) => [...current.filter((e) => e.userId !== userId), ...stamp(bundle.ledger)]);

  if (bundle.settings) await updateSettingsForUser(userId, bundle.settings);

  if (bundle.statistics) {
    const stats = bundle.statistics;
    await statisticsStore.update((current) => {
      const index = current.findIndex((s) => s.userId === userId);
      const record = { ...stats, userId };
      if (index === -1) return [...current, record];
      const next = [...current];
      next[index] = record;
      return next;
    });
  }
}

/**
 * "Clear Entire Business" danger-zone action, scoped to one tenant.
 * Deletes that tenant's transaction/payment/ledger/statistics history but keeps
 * their clients, matching the product requirement to reset all trading activity
 * while preserving the client master list. Other tenants are untouched.
 */
export async function masterReset(userId: string, confirmationPhrase: string): Promise<void> {
  if (confirmationPhrase !== 'RESET') {
    throw new AppError('You must type RESET to confirm this irreversible action', 400, 'CONFIRMATION_REQUIRED');
  }
  await transactionsStore.update((current) => current.filter((t) => t.userId !== userId));
  await paymentsStore.update((current) => current.filter((p) => p.userId !== userId));
  await ledgerStore.update((current) => current.filter((e) => e.userId !== userId));
  await statisticsStore.update((current) => current.filter((s) => s.userId !== userId));
  // Ledger entries are regenerated from each client's opening balance only,
  // since transactions/settlements were just wiped.
  await rebuildAllLedgers(userId);
}
