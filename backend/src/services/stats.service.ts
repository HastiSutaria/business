/**
 * Aggregation logic shared by the dashboard and reports endpoints.
 * Everything here is computed fresh from transactions/ledger/payments
 * (the source of truth) rather than read from the statistics cache,
 * so results are always correct even if the cache write is skipped/fails.
 * Every read is scoped to a single tenant (userId).
 */
import { clientsStore, ledgerStore, paymentsStore, statisticsStore, transactionsStore } from '../database/repositories';
import { Client, Metal, Settlement, Transaction } from '../types';

export function startOfToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isSameDay(dateIso: string, day: string): boolean {
  return dateIso === day;
}

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export function profitFor(transactions: Transaction[]): number {
  const buy = transactions.filter((t) => t.type === 'BUY').reduce((sum, t) => sum + t.amount, 0);
  const sell = transactions.filter((t) => t.type === 'SELL').reduce((sum, t) => sum + t.amount, 0);
  return sell - buy;
}

export function netQuantity(transactions: Transaction[], metal: Metal): number {
  const metalTxns = transactions.filter((t) => t.metal === metal);
  const bought = metalTxns.filter((t) => t.type === 'BUY').reduce((sum, t) => sum + t.quantity, 0);
  const sold = metalTxns.filter((t) => t.type === 'SELL').reduce((sum, t) => sum + t.quantity, 0);
  return bought - sold;
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

async function computeOutstandingTotals(
  userId: string
): Promise<{ receivable: number; payable: number; byClient: Map<string, number> }> {
  const ledger = await ledgerStore.read();
  const byClient = new Map<string, number>();
  for (const entry of ledger) {
    if (entry.userId !== userId) continue;
    byClient.set(entry.clientId, entry.runningBalance);
  }
  let receivable = 0;
  let payable = 0;
  for (const balance of byClient.values()) {
    if (balance > 0) receivable += balance;
    else payable += Math.abs(balance);
  }
  return { receivable, payable, byClient };
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function lastNMonths(n: number): Array<{ label: string; year: number; month: number }> {
  const months: Array<{ label: string; year: number; month: number }> = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

export async function computeDashboardStats(userId: string): Promise<DashboardStats> {
  const [allTransactions, allClients, allSettlements] = await Promise.all([
    transactionsStore.read(),
    clientsStore.read(),
    paymentsStore.read(),
  ]);
  const transactions = allTransactions.filter((t) => t.userId === userId);
  const clients = allClients.filter((c) => c.userId === userId);
  const settlements = allSettlements.filter((s) => s.userId === userId);

  const today = startOfToday();
  const todayTxns = transactions.filter((t) => isSameDay(t.date, today));
  const { receivable, payable, byClient } = await computeOutstandingTotals(userId);

  const clientNameById = new Map<string, Client>(clients.map((c) => [c.id, c]));

  const totalsByClient = new Map<string, number>();
  for (const t of transactions) {
    totalsByClient.set(t.clientId, (totalsByClient.get(t.clientId) ?? 0) + t.amount);
  }
  const topClients = Array.from(totalsByClient.entries())
    .map(([clientId, totalAmount]) => ({
      clientId,
      clientName: clientNameById.get(clientId)?.clientName ?? 'Unknown',
      totalAmount,
      outstanding: byClient.get(clientId) ?? 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  const monthlyProfit = lastNMonths(6).map(({ label, year, month }) => {
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return { month: label, profit: profitFor(monthTxns) };
  });

  const goldTxns = transactions.filter((t) => t.metal === 'GOLD');
  const silverTxns = transactions.filter((t) => t.metal === 'SILVER');
  const goldVsSilver = [
    {
      metal: 'Gold',
      buyAmount: goldTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0),
      sellAmount: goldTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0),
    },
    {
      metal: 'Silver',
      buyAmount: silverTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0),
      sellAmount: silverTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0),
    },
  ];

  const days = lastNDays(14);
  const buyVsSell = days.map((date) => {
    const dayTxns = transactions.filter((t) => t.date === date);
    return {
      date,
      buy: dayTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0),
      sell: dayTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0),
    };
  });

  // Outstanding trend: cumulative receivable/payable snapshot at each of the last 14 days,
  // approximated from ledger entries up to and including that date.
  const allLedger = await ledgerStore.read();
  const ledger = allLedger.filter((e) => e.userId === userId);
  const outstandingTrend = days.map((date) => {
    const balancesUpToDate = new Map<string, number>();
    for (const entry of ledger) {
      if (entry.date <= date) {
        balancesUpToDate.set(entry.clientId, entry.runningBalance);
      }
    }
    let dayReceivable = 0;
    let dayPayable = 0;
    for (const balance of balancesUpToDate.values()) {
      if (balance > 0) dayReceivable += balance;
      else dayPayable += Math.abs(balance);
    }
    return { date, receivable: dayReceivable, payable: dayPayable };
  });

  const stats: DashboardStats = {
    todayProfit: profitFor(todayTxns),
    totalProfit: profitFor(transactions),
    outstandingReceivable: receivable,
    outstandingPayable: payable,
    goldQuantity: netQuantity(transactions, 'GOLD'),
    silverQuantity: netQuantity(transactions, 'SILVER'),
    todayBuyAmount: todayTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0),
    todaySellAmount: todayTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0),
    recentTransactions,
    topClients,
    charts: { monthlyProfit, goldVsSilver, buyVsSell, outstandingTrend },
  };

  void settlements; // settlements already folded into ledger running balances
  return stats;
}

export async function cacheStatistics(userId: string): Promise<void> {
  const stats = await computeDashboardStats(userId);
  const generatedAt = new Date().toISOString();
  await statisticsStore.update((current) => {
    const index = current.findIndex((s) => s.userId === userId);
    const record = {
      userId,
      generatedAt,
      totalProfit: stats.totalProfit,
      outstandingReceivable: stats.outstandingReceivable,
      outstandingPayable: stats.outstandingPayable,
      goldQuantity: stats.goldQuantity,
      silverQuantity: stats.silverQuantity,
    };
    if (index === -1) return [...current, record];
    const next = [...current];
    next[index] = record;
    return next;
  });
}

export interface ProfitReport {
  totalBuy: number;
  totalSell: number;
  netProfit: number;
  averageRate: number;
  highestTransaction: Transaction | null;
  lowestTransaction: Transaction | null;
  numberOfTrades: number;
}

export function buildProfitReport(transactions: Transaction[]): ProfitReport {
  const totalBuy = transactions.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0);
  const totalSell = transactions.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0);
  const rates = transactions.map((t) => t.rate);
  const averageRate = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  const sorted = [...transactions].sort((a, b) => a.amount - b.amount);
  return {
    totalBuy,
    totalSell,
    netProfit: totalSell - totalBuy,
    averageRate,
    highestTransaction: sorted.length ? sorted[sorted.length - 1] : null,
    lowestTransaction: sorted.length ? sorted[0] : null,
    numberOfTrades: transactions.length,
  };
}

export interface MetalReport {
  buyQuantity: number;
  sellQuantity: number;
  netPosition: number;
  profit: number;
  averageRate: number;
}

export function buildMetalReport(transactions: Transaction[], metal: Metal): MetalReport {
  const metalTxns = transactions.filter((t) => t.metal === metal);
  const buyQuantity = metalTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.quantity, 0);
  const sellQuantity = metalTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.quantity, 0);
  const rates = metalTxns.map((t) => t.rate);
  const averageRate = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  return {
    buyQuantity,
    sellQuantity,
    netPosition: buyQuantity - sellQuantity,
    profit: profitFor(metalTxns),
    averageRate,
  };
}

export interface ClientReport {
  totalBuy: number;
  totalSell: number;
  outstanding: number;
  totalSettled: number;
  profit: number;
  goldBuyQuantity: number;
  goldSellQuantity: number;
  silverBuyQuantity: number;
  silverSellQuantity: number;
}

export async function buildClientReport(
  userId: string,
  clientId: string,
  transactions: Transaction[],
  settlements: Settlement[]
): Promise<ClientReport> {
  const clientTxns = transactions.filter((t) => t.clientId === clientId);
  const clientSettlements = settlements.filter((s) => s.clientId === clientId);
  const totalBuy = clientTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0);
  const totalSell = clientTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0);
  const totalSettled = clientSettlements.reduce((s, x) => s + x.amount, 0);
  const { byClient } = await computeOutstandingTotals(userId);
  const goldTxns = clientTxns.filter((t) => t.metal === 'GOLD');
  const silverTxns = clientTxns.filter((t) => t.metal === 'SILVER');
  return {
    totalBuy,
    totalSell,
    outstanding: byClient.get(clientId) ?? 0,
    totalSettled,
    profit: totalSell - totalBuy,
    goldBuyQuantity: goldTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.quantity, 0),
    goldSellQuantity: goldTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.quantity, 0),
    silverBuyQuantity: silverTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.quantity, 0),
    silverSellQuantity: silverTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.quantity, 0),
  };
}

export function filterByDateRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => inRange(t.date, range.from, range.to));
}
