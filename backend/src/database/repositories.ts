/**
 * Central place where every MongoDB-backed collection is instantiated.
 * Import repositories from here rather than constructing MongoStore directly,
 * so there is exactly one instance (and one write-queue) per collection.
 *
 * clients/transactions/payments/ledger/settings/statistics all hold records
 * for EVERY tenant in one array, each record tagged with `userId`. Services
 * are responsible for filtering/stamping by userId — the store layer itself
 * has no notion of tenancy.
 */
import { MongoStore } from '../utils/mongoStore';
import { AdminUser, Client, Transaction, Settlement, LedgerEntry, Settings } from '../types';

export interface StatisticsCache {
  generatedAt: string;
  totalProfit: number;
  outstandingReceivable: number;
  outstandingPayable: number;
  goldQuantity: number;
  silverQuantity: number;
}

export interface StatisticsRecord extends StatisticsCache {
  userId: string;
}

export interface SettingsRecord extends Settings {
  userId: string;
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Hasti Jewellers',
  ownerName: 'Owner',
  currency: 'INR',
  theme: 'system',
  goldUnit: 'gram',
  silverUnit: 'kg',
};

export const clientsStore = new MongoStore<Client[]>('clients', []);
export const transactionsStore = new MongoStore<Transaction[]>('transactions', []);
export const paymentsStore = new MongoStore<Settlement[]>('payments', []);
export const ledgerStore = new MongoStore<LedgerEntry[]>('ledger', []);
export const statisticsStore = new MongoStore<StatisticsRecord[]>('statistics', []);
export const settingsStore = new MongoStore<SettingsRecord[]>('settings', []);
/** Every generated login. There is no self-registration — only the create-admin script adds rows. */
export const adminUserStore = new MongoStore<AdminUser[]>('admin_user', []);
