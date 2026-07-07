import { v4 as uuid } from 'uuid';
import { clientsStore, transactionsStore } from '../database/repositories';
import { Client } from '../types';
import { ClientInput, ClientUpdateInput } from '../validators/client.validator';
import { AppError } from '../utils/errors';
import { rebuildClientLedger } from './ledger.service';

export async function listClients(): Promise<Client[]> {
  return clientsStore.read();
}

export async function getClientById(id: string): Promise<Client> {
  const clients = await clientsStore.read();
  const client = clients.find((c) => c.id === id);
  if (!client) throw AppError.notFound('Client');
  return client;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const now = new Date().toISOString();
  const client: Client = {
    id: uuid(),
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

  await clientsStore.update((current) => {
    if (current.some((c) => c.id === client.id)) {
      throw AppError.conflict('Duplicate client ID generated, please retry');
    }
    return [...current, client];
  });

  await rebuildClientLedger(client.id);
  return client;
}

export async function updateClient(id: string, input: ClientUpdateInput): Promise<Client> {
  let updated: Client | undefined;
  await clientsStore.update((current) => {
    const index = current.findIndex((c) => c.id === id);
    if (index === -1) throw AppError.notFound('Client');
    updated = {
      ...current[index],
      ...input,
      id: current[index].id,
      createdAt: current[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    const next = [...current];
    next[index] = updated;
    return next;
  });
  if (!updated) throw AppError.notFound('Client');
  await rebuildClientLedger(id);
  return updated;
}

export async function deleteClient(id: string): Promise<void> {
  const transactions = await transactionsStore.read();
  const hasTransactions = transactions.some((t) => t.clientId === id);
  if (hasTransactions) {
    throw AppError.conflict('Cannot delete a client with existing transactions. Remove their transactions first.');
  }
  await clientsStore.update((current) => {
    const exists = current.some((c) => c.id === id);
    if (!exists) throw AppError.notFound('Client');
    return current.filter((c) => c.id !== id);
  });
}
