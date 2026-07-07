/**
 * Central place where every JSON-backed collection is instantiated.
 * Import repositories from here rather than constructing JsonStore directly,
 * so there is exactly one instance (and one write-queue) per file.
 */
import { JsonStore } from '../utils/jsonStore';
import { Client, Transaction, Settlement, LedgerEntry, Settings } from '../types';

export interface StatisticsCache {
  generatedAt: string;
  totalProfit: number;
  outstandingReceivable: number;
  outstandingPayable: number;
  goldQuantity: number;
  silverQuantity: number;
}

export const clientsStore = new JsonStore<Client[]>('clients.json', []);
export const transactionsStore = new JsonStore<Transaction[]>('transactions.json', []);
export const paymentsStore = new JsonStore<Settlement[]>('payments.json', []);
export const ledgerStore = new JsonStore<LedgerEntry[]>('ledger.json', []);
export const statisticsStore = new JsonStore<StatisticsCache>('statistics.json', {
  generatedAt: new Date().toISOString(),
  totalProfit: 0,
  outstandingReceivable: 0,
  outstandingPayable: 0,
  goldQuantity: 0,
  silverQuantity: 0,
});
export const settingsStore = new JsonStore<Settings>('settings.json', {
  businessName: 'Hasti Jewellers',
  ownerName: 'Owner',
  currency: 'INR',
  theme: 'system',
  goldUnit: 'gram',
  silverUnit: 'kg',
});
