/**
 * Ledger business logic.
 *
 * Business rule (per product spec):
 *   - BUY  -> we bought metal from the client -> we owe them money -> increases Payable (debit)
 *   - SELL -> we sold metal to the client     -> they owe us money -> increases Receivable (credit)
 *   - Settlement always moves the running balance back toward zero,
 *     regardless of whether it was currently a receivable or a payable.
 *
 * Running balance convention: positive = receivable (client owes us),
 * negative = payable (we owe client).
 *
 * Rather than patch ledger entries incrementally (error-prone once you allow
 * edit/delete of historical transactions), we rebuild a client's entire
 * ledger from its transactions + settlements every time something changes.
 * This guarantees the running balance can never drift out of sync.
 *
 * Every read/write here is additionally scoped by userId (tenant), even
 * though clientId alone would already disambiguate — defense in depth
 * against a client/transaction ever ending up mis-owned.
 */
import { clientsStore, ledgerStore, paymentsStore, transactionsStore } from '../database/repositories';
import { LedgerEntry, Metal, Settlement, Transaction } from '../types';

/** Silver is traded/quoted per kg in the UI; gold per gram. Storage always keeps grams and per-gram rate. */
const GRAMS_PER_KG = 1000;

function describeQuantity(metal: Metal, quantityGrams: number): string {
  return metal === 'SILVER'
    ? `${Math.round((quantityGrams / GRAMS_PER_KG) * 1000) / 1000}kg`
    : `${quantityGrams}g`;
}

function describeRate(metal: Metal, ratePerGram: number): string {
  return metal === 'SILVER' ? `${Math.round(ratePerGram * GRAMS_PER_KG * 100) / 100}` : `${ratePerGram}`;
}

interface ChronoItem {
  date: string;
  time: string;
  createdAt: string;
  kind: 'TRANSACTION' | 'SETTLEMENT';
  ref: Transaction | Settlement;
}

function toChronoItems(transactions: Transaction[], settlements: Settlement[]): ChronoItem[] {
  const items: ChronoItem[] = [
    ...transactions.map((t) => ({
      date: t.date,
      time: t.time,
      createdAt: t.createdAt,
      kind: 'TRANSACTION' as const,
      ref: t,
    })),
    ...settlements.map((s) => ({
      date: s.date,
      time: '00:00',
      createdAt: s.createdAt,
      kind: 'SETTLEMENT' as const,
      ref: s,
    })),
  ];

  items.sort((a, b) => {
    const dateCompare = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
    if (dateCompare !== 0) return dateCompare;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return items;
}

/** Recompute and persist ledger entries for a single client. Pure function over the store. */
export async function rebuildClientLedger(userId: string, clientId: string): Promise<LedgerEntry[]> {
  const [clients, transactions, settlements, fullLedger] = await Promise.all([
    clientsStore.read(),
    transactionsStore.read(),
    paymentsStore.read(),
    ledgerStore.read(),
  ]);

  const client = clients.find((c) => c.id === clientId && c.userId === userId);
  const clientTransactions = transactions.filter((t) => t.clientId === clientId && t.userId === userId);
  const clientSettlements = settlements.filter((s) => s.clientId === clientId && s.userId === userId);
  const items = toChronoItems(clientTransactions, clientSettlements);

  let balance = client?.openingBalance ?? 0;
  const newEntries: LedgerEntry[] = [];

  if (client && client.openingBalance !== 0) {
    newEntries.push({
      id: `opening-${client.id}`,
      userId,
      clientId,
      date: client.createdAt.slice(0, 10),
      type: 'TRANSACTION',
      refId: `opening-${client.id}`,
      description: 'Opening Balance',
      credit: client.openingBalance > 0 ? client.openingBalance : 0,
      debit: client.openingBalance < 0 ? Math.abs(client.openingBalance) : 0,
      runningBalance: balance,
      createdAt: client.createdAt,
    });
  }

  for (const item of items) {
    let credit = 0;
    let debit = 0;
    let description: string;

    if (item.kind === 'TRANSACTION') {
      const t = item.ref as Transaction;
      if (t.type === 'BUY') {
        debit = t.amount;
      } else {
        credit = t.amount;
      }
      balance = balance + credit - debit;
      description = `${t.type} ${t.metal} ${describeQuantity(t.metal, t.quantity)} @ ₹${describeRate(t.metal, t.rate)}`;
      newEntries.push({
        id: `txn-${t.id}`,
        userId,
        clientId,
        date: t.date,
        type: 'TRANSACTION',
        refId: t.id,
        description,
        credit,
        debit,
        runningBalance: balance,
        createdAt: t.createdAt,
      });
    } else {
      const s = item.ref as Settlement;
      if (balance >= 0) {
        debit = s.amount;
      } else {
        credit = s.amount;
      }
      balance = balance + credit - debit;
      description = `Settlement via ${s.paymentMode}${s.referenceNumber ? ` (${s.referenceNumber})` : ''}`;
      newEntries.push({
        id: `stl-${s.id}`,
        userId,
        clientId,
        date: s.date,
        type: 'SETTLEMENT',
        refId: s.id,
        description,
        credit,
        debit,
        runningBalance: balance,
        createdAt: s.createdAt,
      });
    }
  }

  const otherLedgerEntries = fullLedger.filter((e) => !(e.clientId === clientId && e.userId === userId));
  await ledgerStore.write([...otherLedgerEntries, ...newEntries]);

  return newEntries;
}

export async function rebuildAllLedgers(userId: string): Promise<void> {
  const clients = await clientsStore.read();
  for (const client of clients.filter((c) => c.userId === userId)) {
    await rebuildClientLedger(userId, client.id);
  }
}

/** Current outstanding balance for a client: positive = receivable, negative = payable. */
export async function getClientOutstanding(userId: string, clientId: string): Promise<number> {
  const ledger = await ledgerStore.read();
  const entries = ledger.filter((e) => e.clientId === clientId && e.userId === userId);
  if (entries.length === 0) {
    const clients = await clientsStore.read();
    return clients.find((c) => c.id === clientId && c.userId === userId)?.openingBalance ?? 0;
  }
  return entries[entries.length - 1].runningBalance;
}

/** Current outstanding balance for every client of this tenant: positive = receivable, negative = payable. */
export async function getAllOutstandingBalances(userId: string): Promise<Map<string, number>> {
  const [clients, ledger] = await Promise.all([clientsStore.read(), ledgerStore.read()]);

  const lastEntryByClient = new Map<string, LedgerEntry>();
  for (const entry of ledger) {
    if (entry.userId !== userId) continue;
    lastEntryByClient.set(entry.clientId, entry);
  }

  const balances = new Map<string, number>();
  for (const client of clients.filter((c) => c.userId === userId)) {
    const lastEntry = lastEntryByClient.get(client.id);
    balances.set(client.id, lastEntry ? lastEntry.runningBalance : client.openingBalance);
  }
  return balances;
}

/**
 * Returns ledger entries for a client in the exact order rebuildClientLedger produced them
 * (opening balance first, then chronological). Do NOT re-sort by date here: the opening
 * balance entry is dated at client creation time, which can sort after backdated
 * transactions if re-sorted, even though its runningBalance is only valid as the first entry.
 */
export async function getClientLedger(userId: string, clientId: string): Promise<LedgerEntry[]> {
  const ledger = await ledgerStore.read();
  return ledger.filter((e) => e.clientId === clientId && e.userId === userId);
}

/**
 * Transactions still "outstanding" for a client: everything since the balance last
 * touched zero (i.e. since the last time the client was fully settled). A settlement
 * only records a lump-sum amount against the running balance, not which individual
 * transactions it paid off, so once the balance hits exactly zero every transaction
 * before that point is considered squared away and must not resurface here after a
 * later, unrelated transaction is added for the same client.
 */
export async function getClientPendingTransactions(userId: string, clientId: string): Promise<Transaction[]> {
  const [ledger, transactions] = await Promise.all([ledgerStore.read(), transactionsStore.read()]);
  const clientLedger = ledger.filter((e) => e.clientId === clientId && e.userId === userId);

  let lastZeroIndex = -1;
  clientLedger.forEach((entry, index) => {
    if (Math.round(entry.runningBalance * 100) === 0) lastZeroIndex = index;
  });

  const pendingIds = new Set(
    clientLedger
      .slice(lastZeroIndex + 1)
      .filter((e) => e.type === 'TRANSACTION' && !e.refId.startsWith('opening-'))
      .map((e) => e.refId)
  );

  return transactions
    .filter((t) => pendingIds.has(t.id) && t.userId === userId)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}
