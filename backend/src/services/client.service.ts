import { v4 as uuid } from 'uuid';
import { clientsStore, transactionsStore } from '../database/repositories';
import { Client } from '../types';
import { ClientInput, ClientUpdateInput } from '../validators/client.validator';
import { AppError } from '../utils/errors';
import { rebuildClientLedger } from './ledger.service';

export async function listClients(userId: string): Promise<Client[]> {
  const all = await clientsStore.read();
  return all.filter((c) => c.userId === userId);
}

export async function getClientById(userId: string, id: string): Promise<Client> {
  const clients = await clientsStore.read();
  const client = clients.find((c) => c.id === id && c.userId === userId);
  if (!client) throw AppError.notFound('Client');
  return client;
}

export async function createClient(userId: string, input: ClientInput): Promise<Client> {
  const now = new Date().toISOString();
  const client: Client = {
    id: uuid(),
    userId,
    clientName: input.clientName,
    businessName: input.businessName,
    mobile: input.mobile,
    address: input.address ?? '',
    gst: input.gst,
    openingBalance: input.openingBalance ?? 0,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };

  // MongoStore.update() rewraps any error thrown by the mutator into a generic
  // 500 (it loses the AppError subtype), so the mutator here never throws —
  // it just skips the insert and callers check afterwards.
  const after = await clientsStore.update((current) =>
    current.some((c) => c.id === client.id) ? current : [...current, client]
  );
  if (!after.some((c) => c.id === client.id)) {
    throw AppError.conflict('Duplicate client ID generated, please retry');
  }

  await rebuildClientLedger(userId, client.id);
  return client;
}

export async function updateClient(userId: string, id: string, input: ClientUpdateInput): Promise<Client> {
  let updated: Client | undefined;
  await clientsStore.update((current) => {
    const index = current.findIndex((c) => c.id === id && c.userId === userId);
    if (index === -1) return current;
    updated = {
      ...current[index],
      ...input,
      id: current[index].id,
      userId: current[index].userId,
      createdAt: current[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    const next = [...current];
    next[index] = updated;
    return next;
  });
  if (!updated) throw AppError.notFound('Client');
  await rebuildClientLedger(userId, id);
  return updated;
}

export async function deleteClient(userId: string, id: string): Promise<void> {
  const transactions = await transactionsStore.read();
  const hasTransactions = transactions.some((t) => t.clientId === id && t.userId === userId);
  if (hasTransactions) {
    throw AppError.conflict('Cannot delete a client with existing transactions. Remove their transactions first.');
  }

  let existed = false;
  await clientsStore.update((current) => {
    existed = current.some((c) => c.id === id && c.userId === userId);
    if (!existed) return current;
    return current.filter((c) => !(c.id === id && c.userId === userId));
  });
  if (!existed) throw AppError.notFound('Client');
}
