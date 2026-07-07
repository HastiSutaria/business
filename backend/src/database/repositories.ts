/**
 * Central place where every MongoDB-backed collection is instantiated.
 * Import repositories from here rather than constructing MongoStore directly,
 * so there is exactly one instance (and one write-queue) per collection.
 */
import { MongoStore } from '../utils/mongoStore';
import { Client, Transaction, Settlement, LedgerEntry, Settings } from '../types';

export interface StatisticsCache {
  generatedAt: string;
  totalProfit: number;
  outstandingReceivable: number;
  outstandingPayable: number;
  goldQuantity: number;
  silverQuantity: number;
}

export const clientsStore = new MongoStore<Client[]>('clients', []);
export const transactionsStore = new MongoStore<Transaction[]>('transactions', []);
export const paymentsStore = new MongoStore<Settlement[]>('payments', []);
export const ledgerStore = new MongoStore<LedgerEntry[]>('ledger', []);
export const statisticsStore = new MongoStore<StatisticsCache>('statistics', {
  generatedAt: new Date().toISOString(),
  totalProfit: 0,
  outstandingReceivable: 0,
  outstandingPayable: 0,
  goldQuantity: 0,
  silverQuantity: 0,
});
export const settingsStore = new MongoStore<Settings>('settings', {
  businessName: 'Hasti Jewellers',
  ownerName: 'Owner',
  currency: 'INR',
  theme: 'system',
  goldUnit: 'gram',
  silverUnit: 'kg',
});
