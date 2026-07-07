import { v4 as uuid } from 'uuid';
import { clientsStore, transactionsStore } from '../database/repositories';
import { Transaction } from '../types';
import { TransactionInput, TransactionUpdateInput } from '../validators/transaction.validator';
import { AppError } from '../utils/errors';
import { rebuildClientLedger } from './ledger.service';
import { cacheStatistics } from './stats.service';

/** In-memory, process-local buffer of recently deleted transactions to support "Undo Delete". */
const recentlyDeleted: Array<{ transaction: Transaction; deletedAt: number }> = [];
const UNDO_WINDOW_MS = 30_000;

function pruneUndoBuffer(): void {
  const cutoff = Date.now() - UNDO_WINDOW_MS;
  while (recentlyDeleted.length && recentlyDeleted[0].deletedAt < cutoff) {
    recentlyDeleted.shift();
  }
}

export async function listTransactions(): Promise<Transaction[]> {
  return transactionsStore.read();
}

export async function getTransactionById(id: string): Promise<Transaction> {
  const transactions = await transactionsStore.read();
  const txn = transactions.find((t) => t.id === id);
  if (!txn) throw AppError.notFound('Transaction');
  return txn;
}

async function assertClientExists(clientId: string): Promise<void> {
  const clients = await clientsStore.read();
  if (!clients.some((c) => c.id === clientId)) {
    throw new AppError('Client does not exist', 422, 'INVALID_CLIENT');
  }
}

function computeAmount(quantity: number, rate: number): number {
  return Math.round(quantity * rate * 100) / 100;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  await assertClientExists(input.clientId);
  const now = new Date().toISOString();
  const transaction: Transaction = {
    id: uuid(),
    clientId: input.clientId,
    metal: input.metal,
    type: input.type,
    quantity: input.quantity,
    rate: input.rate,
    amount: computeAmount(input.quantity, input.rate),
    date: input.date,
    time: input.time,
    remarks: input.remarks ?? '',
    createdBy: input.createdBy ?? 'Admin',
    createdAt: now,
    updatedAt: now,
  };

  await transactionsStore.update((current) => {
    if (current.some((t) => t.id === transaction.id)) {
      throw AppError.conflict('Duplicate transaction ID generated, please retry');
    }
    return [...current, transaction];
  });

  await rebuildClientLedger(transaction.clientId);
  await cacheStatistics();
  return transaction;
}

export async function duplicateTransaction(id: string): Promise<Transaction> {
  const original = await getTransactionById(id);
  return createTransaction({
    clientId: original.clientId,
    metal: original.metal,
    type: original.type,
    quantity: original.quantity,
    rate: original.rate,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    remarks: original.remarks ?? '',
    createdBy: original.createdBy,
  });
}

export async function updateTransaction(id: string, input: TransactionUpdateInput): Promise<Transaction> {
  if (input.clientId) await assertClientExists(input.clientId);

  let updated: Transaction | undefined;
  let affectedClientIds: string[] = [];

  await transactionsStore.update((current) => {
    const index = current.findIndex((t) => t.id === id);
    if (index === -1) throw AppError.notFound('Transaction');
    const existing = current[index];
    const quantity = input.quantity ?? existing.quantity;
    const rate = input.rate ?? existing.rate;
    updated = {
      ...existing,
      ...input,
      quantity,
      rate,
      amount: computeAmount(quantity, rate),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    affectedClientIds = Array.from(new Set([existing.clientId, updated.clientId]));
    const next = [...current];
    next[index] = updated;
    return next;
  });

  if (!updated) throw AppError.notFound('Transaction');
  for (const clientId of affectedClientIds) {
    await rebuildClientLedger(clientId);
  }
  await cacheStatistics();
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  let removed: Transaction | undefined;
  await transactionsStore.update((current) => {
    const index = current.findIndex((t) => t.id === id);
    if (index === -1) throw AppError.notFound('Transaction');
    removed = current[index];
    return current.filter((t) => t.id !== id);
  });

  if (!removed) throw AppError.notFound('Transaction');
  pruneUndoBuffer();
  recentlyDeleted.push({ transaction: removed, deletedAt: Date.now() });
  await rebuildClientLedger(removed.clientId);
  await cacheStatistics();
}

export async function undoDeleteTransaction(id: string): Promise<Transaction> {
  pruneUndoBuffer();
  const index = recentlyDeleted.findIndex((entry) => entry.transaction.id === id);
  if (index === -1) {
    throw new AppError('Undo window expired or transaction not found', 410, 'UNDO_EXPIRED');
  }
  const { transaction } = recentlyDeleted[index];
  recentlyDeleted.splice(index, 1);

  await transactionsStore.update((current) => [...current, transaction]);
  await rebuildClientLedger(transaction.clientId);
  await cacheStatistics();
  return transaction;
}

export interface TransactionFilters {
  metal?: 'GOLD' | 'SILVER';
  type?: 'BUY' | 'SELL';
  clientId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export function applyFilters(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  return transactions.filter((t) => {
    if (filters.metal && t.metal !== filters.metal) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.clientId && t.clientId !== filters.clientId) return false;
    if (filters.from && t.date < filters.from) return false;
    if (filters.to && t.date > filters.to) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${t.remarks ?? ''} ${t.metal} ${t.type} ${t.quantity} ${t.rate} ${t.amount} ${t.date}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
