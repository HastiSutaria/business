import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { AppError } from '../utils/errors';
import { getUserId } from '../utils/reqUser';
import { transactionSchema, transactionUpdateSchema } from '../validators/transaction.validator';
import * as transactionService from '../services/transaction.service';
import { clientsStore } from '../database/repositories';
import { transactionsToCsv } from '../services/export.service';

function todayRange(): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}

function yesterdayRange(): { from: string; to: string } {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const iso = d.toISOString().slice(0, 10);
  return { from: iso, to: iso };
}

function weekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return { from: monday.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

function resolveDatePreset(preset?: string): { from?: string; to?: string } {
  switch (preset) {
    case 'today':
      return todayRange();
    case 'yesterday':
      return yesterdayRange();
    case 'week':
      return weekRange();
    case 'month':
      return monthRange();
    default:
      return {};
  }
}

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { metal, type, clientId, search, datePreset, from, to, page, pageSize } = req.query;

  let transactions = await transactionService.listTransactions(userId);

  const preset = resolveDatePreset(typeof datePreset === 'string' ? datePreset : undefined);
  const effectiveFrom = typeof from === 'string' && from ? from : preset.from;
  const effectiveTo = typeof to === 'string' && to ? to : preset.to;

  transactions = transactionService.applyFilters(transactions, {
    metal: metal === 'GOLD' || metal === 'SILVER' ? metal : undefined,
    type: type === 'BUY' || type === 'SELL' ? type : undefined,
    clientId: typeof clientId === 'string' ? clientId : undefined,
    from: effectiveFrom,
    to: effectiveTo,
    search: typeof search === 'string' ? search : undefined,
  });

  transactions = [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pageNum = Math.max(1, parseInt(String(page ?? '1'), 10) || 1);
  const size = Math.min(200, Math.max(1, parseInt(String(pageSize ?? '25'), 10) || 25));
  const total = transactions.length;
  const start = (pageNum - 1) * size;
  const paginated = transactions.slice(start, start + size);

  ok(res, { items: paginated, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) || 1 });
});

export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const txn = await transactionService.getTransactionById(userId, req.params.id);
  ok(res, txn);
});

export const createTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const txn = await transactionService.createTransaction(userId, parsed.data);
  created(res, txn);
});

export const updateTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parsed = transactionUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const txn = await transactionService.updateTransaction(userId, req.params.id, parsed.data);
  ok(res, txn);
});

export const deleteTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  await transactionService.deleteTransaction(userId, req.params.id);
  ok(res, { id: req.params.id });
});

export const undoDeleteTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const txn = await transactionService.undoDeleteTransaction(userId, req.params.id);
  ok(res, txn);
});

export const duplicateTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const txn = await transactionService.duplicateTransaction(userId, req.params.id);
  created(res, txn);
});

export const exportTransactionsCsv = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { metal, type, clientId, from, to, search } = req.query;
  let transactions = await transactionService.listTransactions(userId);
  transactions = transactionService.applyFilters(transactions, {
    metal: metal === 'GOLD' || metal === 'SILVER' ? metal : undefined,
    type: type === 'BUY' || type === 'SELL' ? type : undefined,
    clientId: typeof clientId === 'string' ? clientId : undefined,
    from: typeof from === 'string' ? from : undefined,
    to: typeof to === 'string' ? to : undefined,
    search: typeof search === 'string' ? search : undefined,
  });
  const allClients = await clientsStore.read();
  const clients = allClients.filter((c) => c.userId === userId);
  const csv = transactionsToCsv(transactions, clients);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
  res.send(csv);
});
