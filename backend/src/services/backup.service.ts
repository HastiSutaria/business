/**
 * Backup, restore and "Master Reset" (danger zone) operations.
 * Backups are full snapshots of every JSON file, zipped-free (plain JSON bundle)
 * and written under backend/backups/<timestamp>.json so they can be restored later.
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
import { Client, LedgerEntry, Settings, Settlement, Transaction } from '../types';
import { StatisticsCache } from '../database/repositories';

const BACKUPS_DIR = path.join(__dirname, '..', '..', 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

interface BackupBundle {
  createdAt: string;
  clients: Client[];
  transactions: Transaction[];
  payments: Settlement[];
  ledger: LedgerEntry[];
  settings: Settings;
  statistics: StatisticsCache;
}

export async function createBackup(): Promise<{ fileName: string; createdAt: string }> {
  const bundle: BackupBundle = {
    createdAt: new Date().toISOString(),
    clients: await clientsStore.read(),
    transactions: await transactionsStore.read(),
    payments: await paymentsStore.read(),
    ledger: await ledgerStore.read(),
    settings: await settingsStore.read(),
    statistics: await statisticsStore.read(),
  };

  const fileName = `backup-${bundle.createdAt.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(BACKUPS_DIR, fileName), JSON.stringify(bundle, null, 2), 'utf-8');

  await settingsStore.update((s) => ({ ...s, lastBackupAt: bundle.createdAt }));

  return { fileName, createdAt: bundle.createdAt };
}

export function listBackups(): Array<{ fileName: string; createdAt: string; sizeBytes: number }> {
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((fileName) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, fileName));
      return { fileName, createdAt: stat.mtime.toISOString(), sizeBytes: stat.size };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreBackup(fileName: string): Promise<void> {
  const safeFileName = path.basename(fileName);
  const filePath = path.join(BACKUPS_DIR, safeFileName);
  if (!fs.existsSync(filePath)) {
    throw AppError.notFound('Backup file');
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const bundle = JSON.parse(raw) as BackupBundle;

  await clientsStore.write(bundle.clients ?? []);
  await transactionsStore.write(bundle.transactions ?? []);
  await paymentsStore.write(bundle.payments ?? []);
  await ledgerStore.write(bundle.ledger ?? []);
  if (bundle.settings) await settingsStore.write(bundle.settings);
  if (bundle.statistics) await statisticsStore.write(bundle.statistics);
}

/**
 * "Clear Entire Business" danger-zone action.
 * Deletes all transaction/payment/ledger/statistics history but keeps clients,
 * matching the product requirement to reset all trading activity while
 * preserving the client master list.
 */
export async function masterReset(confirmationPhrase: string): Promise<void> {
  if (confirmationPhrase !== 'RESET') {
    throw new AppError('You must type RESET to confirm this irreversible action', 400, 'CONFIRMATION_REQUIRED');
  }
  await transactionsStore.reset();
  await paymentsStore.reset();
  await ledgerStore.reset();
  await statisticsStore.reset();
  // Ledger entries are regenerated from each client's opening balance only,
  // since transactions/settlements were just wiped.
  await rebuildAllLedgers();
}
