import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { AppError } from '../utils/errors';
import { clientSchema, clientUpdateSchema } from '../validators/client.validator';
import * as clientService from '../services/client.service';
import {
  getAllOutstandingBalances,
  getClientLedger,
  getClientOutstanding,
  getClientPendingTransactions,
} from '../services/ledger.service';

export const getClients = asyncHandler(async (req: Request, res: Response) => {
  const { search, sortBy, sortDir } = req.query;
  let clients = await clientService.listClients();

  if (typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    clients = clients.filter((c) =>
      [c.clientName, c.businessName, c.mobile, c.gst ?? ''].join(' ').toLowerCase().includes(q)
    );
  }

  if (typeof sortBy === 'string') {
    const dir = sortDir === 'desc' ? -1 : 1;
    clients = [...clients].sort((a, b) => {
      const field = sortBy as keyof typeof a;
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }

  ok(res, clients);
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientById(req.params.id);
  ok(res, client);
});

export const createClientHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const client = await clientService.createClient(parsed.data);
  created(res, client);
});

export const updateClientHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = clientUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const client = await clientService.updateClient(req.params.id, parsed.data);
  ok(res, client);
});

export const deleteClientHandler = asyncHandler(async (req: Request, res: Response) => {
  await clientService.deleteClient(req.params.id);
  ok(res, { id: req.params.id });
});

export const getClientsOutstandingHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [clients, balances] = await Promise.all([clientService.listClients(), getAllOutstandingBalances()]);
  const result = clients
    .map((client) => ({ client, outstanding: balances.get(client.id) ?? 0 }))
    .sort((a, b) => Math.abs(b.outstanding) - Math.abs(a.outstanding));
  ok(res, result);
});

export const getClientLedgerHandler = asyncHandler(async (req: Request, res: Response) => {
  const [ledger, outstanding, client] = await Promise.all([
    getClientLedger(req.params.id),
    getClientOutstanding(req.params.id),
    clientService.getClientById(req.params.id),
  ]);
  ok(res, { client, ledger, outstanding });
});

export const getClientPendingTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const [transactions, outstanding, client] = await Promise.all([
    getClientPendingTransactions(req.params.id),
    getClientOutstanding(req.params.id),
    clientService.getClientById(req.params.id),
  ]);
  ok(res, { client, transactions, outstanding });
});
