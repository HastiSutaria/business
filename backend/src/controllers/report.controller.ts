import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { AppError } from '../utils/errors';
import { transactionsStore, paymentsStore, clientsStore } from '../database/repositories';
import {
  buildClientReport,
  buildMetalReport,
  buildProfitReport,
  computeDashboardStats,
  filterByDateRange,
} from '../services/stats.service';

function rangeFromQuery(req: Request): { from?: string; to?: string } {
  const { from, to, preset } = req.query;
  if (typeof preset === 'string') {
    const now = new Date();
    const toIso = now.toISOString().slice(0, 10);
    switch (preset) {
      case 'today':
        return { from: toIso, to: toIso };
      case 'yesterday': {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        const iso = d.toISOString().slice(0, 10);
        return { from: iso, to: iso };
      }
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return { from: d.toISOString().slice(0, 10), to: toIso };
      }
      case 'month': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: d.toISOString().slice(0, 10), to: toIso };
      }
      case 'quarter': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 3);
        return { from: d.toISOString().slice(0, 10), to: toIso };
      }
      case 'year': {
        const d = new Date(now.getFullYear(), 0, 1);
        return { from: d.toISOString().slice(0, 10), to: toIso };
      }
      default:
        break;
    }
  }
  return {
    from: typeof from === 'string' && from ? from : undefined,
    to: typeof to === 'string' && to ? to : undefined,
  };
}

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await computeDashboardStats();
  ok(res, stats);
});

export const getProfitReport = asyncHandler(async (req: Request, res: Response) => {
  const range = rangeFromQuery(req);
  const transactions = filterByDateRange(await transactionsStore.read(), range);
  const report = buildProfitReport(transactions);
  ok(res, { range, ...report });
});

export const getMetalReport = asyncHandler(async (req: Request, res: Response) => {
  const range = rangeFromQuery(req);
  const transactions = filterByDateRange(await transactionsStore.read(), range);
  const gold = buildMetalReport(transactions, 'GOLD');
  const silver = buildMetalReport(transactions, 'SILVER');
  ok(res, { range, gold, silver });
});

export const getClientReport = asyncHandler(async (req: Request, res: Response) => {
  const clients = await clientsStore.read();
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) throw AppError.notFound('Client');

  const range = rangeFromQuery(req);
  const transactions = filterByDateRange(await transactionsStore.read(), range);
  const settlements = await paymentsStore.read();
  const report = await buildClientReport(client.id, transactions, settlements);
  ok(res, { client, range, ...report });
});
