import { clientsStore, transactionsStore } from '../database/repositories';
import { Client, Transaction } from '../types';

export interface SearchResult {
  transactions: Transaction[];
  clients: Client[];
}

export async function globalSearch(query: string): Promise<SearchResult> {
  const q = query.trim().toLowerCase();
  if (!q) return { transactions: [], clients: [] };

  const [clients, transactions] = await Promise.all([clientsStore.read(), transactionsStore.read()]);
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
