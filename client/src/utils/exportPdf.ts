import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '@/types';
import { formatCurrencyPrecise } from './format';

export function exportTransactionsToPdf(transactions: Transaction[], clientNameById: Map<string, string>): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Transaction History', 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [['Date', 'Time', 'Client', 'Metal', 'Type', 'Qty (g)', 'Rate', 'Amount', 'Remarks']],
    body: transactions.map((t) => [
      t.date,
      t.time,
      clientNameById.get(t.clientId) ?? t.clientId,
      t.metal,
      t.type,
      t.quantity,
      formatCurrencyPrecise(t.rate),
      formatCurrencyPrecise(t.amount),
      t.remarks ?? '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.save(`transactions-${Date.now()}.pdf`);
}
