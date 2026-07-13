/**
 * ONE-TIME migration: converts the old single-tenant collections (clients,
 * transactions, payments, ledger, settings, statistics, admin_user — each
 * previously a single shared blob) into the new per-tenant shape, assigning
 * every existing record to one target login.
 *
 * admin_user/settings/statistics predate this migration and were stored as a
 * single singleton document (an object), not an array — this script reads
 * them defensively (never assuming array methods exist yet) and rewrites
 * them wholesale into the new array-of-records shape via `.write()`.
 *
 * clients/transactions/payments/ledger were already arrays; this script only
 * stamps a `userId` onto elements that don't have one yet.
 *
 * Safe to re-run: already-tagged records / already-converted collections are
 * left alone.
 *
 *   npm run migrate-to-user -- --login-id=admin
 */
import dotenv from 'dotenv';
dotenv.config();

import {
  clientsStore,
  ledgerStore,
  paymentsStore,
  settingsStore,
  statisticsStore,
  transactionsStore,
  adminUserStore,
  DEFAULT_SETTINGS,
  SettingsRecord,
  StatisticsRecord,
} from '../database/repositories';
import { AdminUser, Settings } from '../types';
import { StatisticsCache } from '../database/repositories';
import { rebuildAllLedgers } from '../services/ledger.service';
import { connectToDatabase, closeDatabaseConnection } from './mongoClient';
import { MongoStore } from './mongoStore';

function readFlag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match?.slice(name.length + 3);
}

/** Reads a document without assuming its shape yet — old singleton object, new array, or absent. */
async function readRaw<T>(collectionName: string): Promise<T | undefined> {
  return new MongoStore<T | undefined>(collectionName, undefined).read();
}

async function migrate(): Promise<void> {
  await connectToDatabase();

  const targetLoginId = readFlag('login-id') ?? 'admin';

  // --- admin_user: singleton AdminUser|null, OR already AdminUser[] --------
  const rawAdmin = await readRaw<AdminUser | AdminUser[]>('admin_user');
  const adminsArray: AdminUser[] = Array.isArray(rawAdmin) ? rawAdmin : rawAdmin ? [rawAdmin] : [];

  const targetUserId = adminsArray.find((a) => a.loginId === targetLoginId)?.id;

  if (!targetUserId) {
    // eslint-disable-next-line no-console
    console.error(
      `No login "${targetLoginId}" found. Run "npm run create-admin -- --login-id=${targetLoginId} --password=..." first.`
    );
    await closeDatabaseConnection();
    process.exit(1);
    return;
  }

  if (!Array.isArray(rawAdmin)) {
    await adminUserStore.write(adminsArray);
    // eslint-disable-next-line no-console
    console.log('Converted legacy admin_user singleton -> array.');
  }

  const userId = targetUserId;
  // eslint-disable-next-line no-console
  console.log(`Migrating existing data to login "${targetLoginId}" (userId ${userId})...`);

  // --- clients/transactions/payments/ledger: stamp missing userId ----------
  // These were already arrays, so .update() is safe as-is.
  const clientsResult = await clientsStore.update((current) =>
    current.map((c) => (c.userId ? c : { ...c, userId }))
  );
  const stampedClients = clientsResult.filter((c) => c.userId === userId).length;

  const transactionsResult = await transactionsStore.update((current) =>
    current.map((t) => (t.userId ? t : { ...t, userId }))
  );
  const stampedTransactions = transactionsResult.filter((t) => t.userId === userId).length;

  const paymentsResult = await paymentsStore.update((current) =>
    current.map((s) => (s.userId ? s : { ...s, userId }))
  );
  const stampedPayments = paymentsResult.filter((s) => s.userId === userId).length;

  // Ledger is fully regenerable from clients+transactions+payments, so rather than
  // patch old entries in place, drop any un-tagged ones and rebuild fresh below.
  await ledgerStore.update((current) => current.filter((e) => e.userId));

  // --- settings: singleton Settings, OR already SettingsRecord[] -----------
  const rawSettings = await readRaw<Settings | SettingsRecord[]>('settings');
  const settingsArray: SettingsRecord[] = Array.isArray(rawSettings)
    ? rawSettings
    : rawSettings
      ? [{ ...rawSettings, userId }]
      : [];
  if (!settingsArray.some((s) => s.userId === userId)) {
    settingsArray.push({ ...DEFAULT_SETTINGS, userId });
  }
  if (!Array.isArray(rawSettings)) {
    await settingsStore.write(settingsArray);
    // eslint-disable-next-line no-console
    console.log('Converted legacy settings singleton -> per-user record(s).');
  }

  // --- statistics: singleton StatisticsCache, OR already StatisticsRecord[] -
  const rawStats = await readRaw<StatisticsCache | StatisticsRecord[]>('statistics');
  const statsArray: StatisticsRecord[] = Array.isArray(rawStats) ? rawStats : rawStats ? [{ ...rawStats, userId }] : [];
  if (!Array.isArray(rawStats) && rawStats) {
    await statisticsStore.write(statsArray);
    // eslint-disable-next-line no-console
    console.log('Converted legacy statistics singleton -> per-user record(s).');
  }

  await rebuildAllLedgers(userId);

  // eslint-disable-next-line no-console
  console.log('\nMigration complete:');
  // eslint-disable-next-line no-console
  console.log(`  Clients tagged:      ${stampedClients}`);
  // eslint-disable-next-line no-console
  console.log(`  Transactions tagged: ${stampedTransactions}`);
  // eslint-disable-next-line no-console
  console.log(`  Settlements tagged:  ${stampedPayments}`);
  // eslint-disable-next-line no-console
  console.log('  Ledger rebuilt from scratch.\n');

  await closeDatabaseConnection();
}

migrate()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await closeDatabaseConnection();
    // eslint-disable-next-line no-console
    console.error('Migration failed:', err);
    process.exit(1);
  });
