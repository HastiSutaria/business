import { v4 as uuid } from 'uuid';
import { clientsStore, paymentsStore } from '../database/repositories';
import { Settlement } from '../types';
import { SettlementInput } from '../validators/settlement.validator';
import { AppError } from '../utils/errors';
import { rebuildClientLedger } from './ledger.service';
import { cacheStatistics } from './stats.service';

export async function listSettlements(userId: string): Promise<Settlement[]> {
  const all = await paymentsStore.read();
  return all.filter((s) => s.userId === userId);
}

export async function createSettlement(userId: string, input: SettlementInput): Promise<Settlement> {
  const clients = await clientsStore.read();
  if (!clients.some((c) => c.id === input.clientId && c.userId === userId)) {
    throw new AppError('Client does not exist', 422, 'INVALID_CLIENT');
  }

  const now = new Date().toISOString();
  const settlement: Settlement = {
    id: uuid(),
    userId,
    clientId: input.clientId,
    amount: input.amount,
    paymentMode: input.paymentMode,
    referenceNumber: input.referenceNumber ?? '',
    date: input.date,
    remarks: input.remarks ?? '',
    createdAt: now,
  };

  const after = await paymentsStore.update((current) =>
    current.some((s) => s.id === settlement.id) ? current : [...current, settlement]
  );
  if (!after.some((s) => s.id === settlement.id)) {
    throw AppError.conflict('Duplicate settlement ID generated, please retry');
  }

  await rebuildClientLedger(userId, settlement.clientId);
  await cacheStatistics(userId);
  return settlement;
}

export async function listSettlementsForClient(userId: string, clientId: string): Promise<Settlement[]> {
  const settlements = await paymentsStore.read();
  return settlements.filter((s) => s.clientId === clientId && s.userId === userId);
}
