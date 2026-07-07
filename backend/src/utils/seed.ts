/**
 * Seeds the JSON database with sample clients and transactions so the app
 * has realistic data to explore on first run. Run with `npm run seed`.
 * Safe to re-run: it overwrites existing data files.
 */
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuid } from 'uuid';
import { clientsStore, ledgerStore, paymentsStore, transactionsStore } from '../database/repositories';
import { Client, Transaction, Settlement } from '../types';
import { rebuildAllLedgers } from '../services/ledger.service';
import { cacheStatistics } from '../services/stats.service';
import { connectToDatabase, closeDatabaseConnection } from './mongoClient';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function seed(): Promise<void> {
  await connectToDatabase();

  const now = new Date().toISOString();

  const clients: Client[] = [
    {
      id: uuid(),
      clientName: 'Rajesh Shah',
      businessName: 'ABC Jewellers',
      mobile: '9876543210',
      address: 'Zaveri Bazaar, Mumbai',
      gst: '27ABCDE1234F1Z5',
      openingBalance: 15000,
      notes: 'Regular gold buyer',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      clientName: 'Vikram Mehta',
      businessName: 'XYZ Bullion',
      mobile: '9123456780',
      address: 'MG Road, Ahmedabad',
      gst: '',
      openingBalance: -8000,
      notes: 'Silver bulk trader',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      clientName: 'Priya Kothari',
      businessName: 'Kothari Gold House',
      mobile: '9988776655',
      address: 'Johari Bazaar, Jaipur',
      gst: '08KOTHA5678G1Z2',
      openingBalance: 0,
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const [abc, xyz, kothari] = clients;

  const rawTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'amount'>> = [
    { clientId: abc.id, metal: 'GOLD', type: 'BUY', quantity: 10, rate: 9600, date: isoDaysAgo(6), time: '10:30', remarks: 'Bar purchase', createdBy: 'Admin' },
    { clientId: abc.id, metal: 'GOLD', type: 'SELL', quantity: 5, rate: 9750, date: isoDaysAgo(4), time: '15:00', remarks: 'Retail sale', createdBy: 'Admin' },
    { clientId: xyz.id, metal: 'SILVER', type: 'SELL', quantity: 5000, rate: 108, date: isoDaysAgo(3), time: '11:15', remarks: 'Bulk silver deal', createdBy: 'Admin' },
    { clientId: xyz.id, metal: 'SILVER', type: 'BUY', quantity: 2000, rate: 104, date: isoDaysAgo(2), time: '09:45', remarks: '', createdBy: 'Admin' },
    { clientId: kothari.id, metal: 'GOLD', type: 'BUY', quantity: 20, rate: 9550, date: isoDaysAgo(1), time: '13:20', remarks: 'Wholesale lot', createdBy: 'Admin' },
    { clientId: kothari.id, metal: 'GOLD', type: 'SELL', quantity: 8, rate: 9800, date: isoDaysAgo(0), time: '17:10', remarks: 'Same day flip', createdBy: 'Admin' },
  ];

  const transactions: Transaction[] = rawTransactions.map((t) => ({
    ...t,
    id: uuid(),
    amount: Math.round(t.quantity * t.rate * 100) / 100,
    createdAt: now,
    updatedAt: now,
  }));

  const settlements: Settlement[] = [
    {
      id: uuid(),
      clientId: abc.id,
      amount: 20000,
      paymentMode: 'UPI',
      referenceNumber: 'UPI/2024/001122',
      date: isoDaysAgo(2),
      remarks: 'Partial settlement',
      createdAt: now,
    },
  ];

  await clientsStore.write(clients);
  await transactionsStore.write(transactions);
  await paymentsStore.write(settlements);
  await ledgerStore.write([]);
  await rebuildAllLedgers();
  await cacheStatistics();

  // eslint-disable-next-line no-console
  console.log('Seed data written:');
  // eslint-disable-next-line no-console
  console.log(`  Clients: ${clients.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Transactions: ${transactions.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Settlements: ${settlements.length}`);

  await closeDatabaseConnection();
}

seed()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await closeDatabaseConnection();
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', err);
    process.exit(1);
  });
