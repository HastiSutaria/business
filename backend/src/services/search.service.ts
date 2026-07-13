import { clientsStore, transactionsStore } from '../database/repositories';
import { Client, Transaction } from '../types';

export interface SearchResult {
  transactions: Transaction[];
  clients: Client[];
}

export async function globalSearch(userId: string, query: string): Promise<SearchResult> {
  const q = query.trim().toLowerCase();
  if (!q) return { transactions: [], clients: [] };

  const [allClients, allTransactions] = await Promise.all([clientsStore.read(), transactionsStore.read()]);
  const clients = allClients.filter((c) => c.userId === userId);
  const transactions = allTransactions.filter((t) => t.userId === userId);
  const clientNameById = new Map(clients.map((c) => [c.id, c.clientName]));

  const matchedTransactions = transactions.filter((t) => {
    const haystack = [
      clientNameById.get(t.clientId) ?? '',
      t.metal,
      t.type,
      String(t.quantity),
      String(t.rate),
      String(t.amount),
      t.remarks ?? '',
      t.date,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const matchedClients = clients.filter((c) =>
    [c.clientName, c.businessName, c.mobile, c.gst ?? '', c.notes ?? ''].join(' ').toLowerCase().includes(q)
  );

  return { transactions: matchedTransactions.slice(0, 50), clients: matchedClients.slice(0, 50) };
}
