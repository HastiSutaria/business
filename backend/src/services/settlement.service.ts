import { v4 as uuid } from 'uuid';
import { clientsStore, paymentsStore } from '../database/repositories';
import { Settlement } from '../types';
import { SettlementInput } from '../validators/settlement.validator';
import { AppError } from '../utils/errors';
import { rebuildClientLedger } from './ledger.service';
import { cacheStatistics } from './stats.service';

export async function listSettlements(): Promise<Settlement[]> {
  return paymentsStore.read();
}

export async function createSettlement(input: SettlementInput): Promise<Settlement> {
  const clients = await clientsStore.read();
  if (!clients.some((c) => c.id === input.clientId)) {
    throw new AppError('Client does not exist', 422, 'INVALID_CLIENT');
  }

  const now = new Date().toISOString();
  const settlement: Settlement = {
    id: uuid(),
    clientId: input.clientId,
    amount: input.amount,
    paymentMode: input.paymentMode,
    referenceNumber: input.referenceNumber ?? '',
    date: input.date,
    remarks: input.remarks ?? '',
    createdAt: now,
  };

  await paymentsStore.update((current) => {
    if (current.some((s) => s.id === settlement.id)) {
      throw AppError.conflict('Duplicate settlement ID generated, please retry');
    }
    return [...current, settlement];
  });

  await rebuildClientLedger(settlement.clientId);
  await cacheStatistics();
  return settlement;
}

export async function listSettlementsForClient(clientId: string): Promise<Settlement[]> {
  const settlements = await paymentsStore.read();
  return settlements.filter((s) => s.clientId === clientId);
}
