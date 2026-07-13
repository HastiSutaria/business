/** Mirrors backend/src/types/index.ts - kept in sync manually since there is no shared package. */

export type Metal = 'GOLD' | 'SILVER';
export type TransactionType = 'BUY' | 'SELL';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';

export interface Client {
  id: string;
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
  clientId: string;
  metal: Metal;
  type: TransactionType;
  quantity: number;
  rate: number;
  amount: number;
  date: string;
  time: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  clientId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  date: string;
  remarks?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  clientId: string;
  date: string;
  type: 'TRANSACTION' | 'SETTLEMENT';
  refId: string;
  description: string;
  credit: number;
  debit: number;
  runningBalance: number;
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

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  todayProfit: number;
  totalProfit: number;
  outstandingReceivable: number;
  outstandingPayable: number;
  goldQuantity: number;
  silverQuantity: number;
  todayBuyAmount: number;
  todaySellAmount: number;
  recentTransactions: Transaction[];
  topClients: Array<{ clientId: string; clientName: string; totalAmount: number; outstanding: number }>;
  charts: {
    monthlyProfit: Array<{ month: string; profit: number }>;
    goldVsSilver: Array<{ metal: string; buyAmount: number; sellAmount: number }>;
    buyVsSell: Array<{ date: string; buy: number; sell: number }>;
    outstandingTrend: Array<{ date: string; receivable: number; payable: number }>;
  };
}

export interface ProfitReport {
  range: { from?: string; to?: string };
  totalBuy: number;
  totalSell: number;
  netProfit: number;
  averageRate: number;
  highestTransaction: Transaction | null;
  lowestTransaction: Transaction | null;
  numberOfTrades: number;
}

export interface MetalReportEntry {
  buyQuantity: number;
  sellQuantity: number;
  netPosition: number;
  profit: number;
  averageRate: number;
}

export interface MetalReport {
  range: { from?: string; to?: string };
  gold: MetalReportEntry;
  silver: MetalReportEntry;
}

export interface ClientReport {
  client: Client;
  range: { from?: string; to?: string };
  totalBuy: number;
  totalSell: number;
  outstanding: number;
  totalSettled: number;
  profit: number;
}

export interface ClientLedgerResponse {
  client: Client;
  ledger: LedgerEntry[];
  outstanding: number;
}

export interface ApiErrorShape {
  message: string;
  code: string;
  details?: unknown;
}

export interface BackupInfo {
  fileName: string;
  createdAt: string;
  sizeBytes?: number;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  loginId: string;
}
