import { Transaction, Client, Metal } from '../types';

/** Silver is traded/quoted per kg in the UI; gold per gram. Storage always keeps grams and per-gram rate. */
const GRAMS_PER_KG = 1000;

function displayQuantity(metal: Metal, quantityGrams: number): number {
  return metal === 'SILVER' ? quantityGrams / GRAMS_PER_KG : quantityGrams;
}

function displayRate(metal: Metal, ratePerGram: number): number {
  return metal === 'SILVER' ? ratePerGram * GRAMS_PER_KG : ratePerGram;
}

function quantityUnit(metal: Metal): string {
  return metal === 'SILVER' ? 'kg' : 'g';
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function transactionsToCsv(transactions: Transaction[], clients: Client[]): string {
  const clientNameById = new Map(clients.map((c) => [c.id, c.clientName]));
  const header = ['Date', 'Time', 'Client', 'Metal', 'Type', 'Quantity', 'Rate', 'Amount', 'Remarks', 'Created By'];
  const rows = transactions.map((t) => [
    t.date,
    t.time,
    clientNameById.get(t.clientId) ?? t.clientId,
    t.metal,
    t.type,
    `${displayQuantity(t.metal, t.quantity)}${quantityUnit(t.metal)}`,
    `${displayRate(t.metal, t.rate)}/${quantityUnit(t.metal)}`,
    t.amount,
    t.remarks ?? '',
    t.createdBy,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}
