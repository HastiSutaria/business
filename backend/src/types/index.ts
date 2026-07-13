/**
 * Core domain types for the Gold & Silver Trading Business Management Application.
 * These types are the single source of truth for the shape of data persisted
 * to the JSON file store. Keep them in sync with client/src/types.
 *
 * Every business record is scoped to a single tenant via `userId` (the owning
 * AdminUser's id). Each generated login is its own isolated business — no
 * record is ever readable or writable by a different userId.
 */

export type Metal = 'GOLD' | 'SILVER';

export type TransactionType = 'BUY' | 'SELL';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';

export interface Client {
  id: string;
  userId: string;
  clientName: string;
  businessName: string;
  mobile: string;
  address: string;
  gst?: string;
  openingBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  clientId: string;
  metal: Metal;
  type: TransactionType;
  quantity: number; // grams for gold, grams for silver (normalized in base unit: grams)
  rate: number; // per gram
  amount: number; // quantity * rate, auto-calculated
  date: string; // ISO date (YYYY-MM-DD)
  time: string; // HH:mm
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  userId: string;
  clientId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  date: string;
  remarks?: string;
  createdAt: string;
}

/** A single ledger entry generated from a transaction or settlement. */
export interface LedgerEntry {
  id: string;
  userId: string;
  clientId: string;
  date: string;
  type: 'TRANSACTION' | 'SETTLEMENT';
  refId: string;
  description: string;
  credit: number; // amount client owes us (increases receivable)
  debit: number; // amount we owe client (increases payable) / settlement paid out
  runningBalance: number; // positive = receivable from client, negative = payable to client
  createdAt: string;
}

export interface Settings {
  businessName: string;
  ownerName: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  goldUnit: 'gram' | 'kg';
  silverUnit: 'gram' | 'kg';
  lastBackupAt?: string;
}

export interface DeletedTransactionSnapshot {
  transaction: Transaction;
  deletedAt: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

/** A system-generated login. There is no self-registration — each one is its own isolated tenant. */
export interface AdminUser {
  id: string;
  loginId: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}
