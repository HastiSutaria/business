import { Transaction, Client } from '../types';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function transactionsToCsv(transactions: Transaction[], clients: Client[]): string {
  const clientNameById = new Map(clients.map((c) => [c.id, c.clientName]));
  const header = ['Date', 'Time', 'Client', 'Metal', 'Type', 'Quantity(g)', 'Rate', 'Amount', 'Remarks', 'Created By'];
  const rows = transactions.map((t) => [
    t.date,
    t.time,
    clientNameById.get(t.clientId) ?? t.clientId,
    t.metal,
    t.type,
    t.quantity,
    t.rate,
    t.amount,
    t.remarks ?? '',
    t.createdBy,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}
