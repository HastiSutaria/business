import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '@/types';
import { formatCurrencyPrecise } from './format';
import { toDisplayQuantity, toDisplayRate, quantityUnit } from './units';

export function exportTransactionsToPdf(transactions: Transaction[], clientNameById: Map<string, string>): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Transaction History', 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [['Date', 'Time', 'Client', 'Metal', 'Type', 'Qty', 'Rate', 'Amount', 'Remarks']],
    body: transactions.map((t) => [
      t.date,
      t.time,
      clientNameById.get(t.clientId) ?? t.clientId,
      t.metal,
      t.type,
      `${toDisplayQuantity(t.metal, t.quantity)} ${quantityUnit(t.metal)}`,
      `${formatCurrencyPrecise(toDisplayRate(t.metal, t.rate))} / ${quantityUnit(t.metal)}`,
      formatCurrencyPrecise(t.amount),
      t.remarks ?? '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  const totalBuyAmount = transactions.filter((t) => t.type === 'BUY').reduce((sum, t) => sum + t.amount, 0);
  const totalSellAmount = transactions.filter((t) => t.type === 'SELL').reduce((sum, t) => sum + t.amount, 0);
  const difference = totalSellAmount - totalBuyAmount;

  const metalRows = (['GOLD', 'SILVER'] as const)
    .map((metal) => {
      const metalTxns = transactions.filter((t) => t.metal === metal);
      if (metalTxns.length === 0) return null;
      const buyQty = metalTxns.filter((t) => t.type === 'BUY').reduce((sum, t) => sum + t.quantity, 0);
      const sellQty = metalTxns.filter((t) => t.type === 'SELL').reduce((sum, t) => sum + t.quantity, 0);
      const unit = quantityUnit(metal);
      return [
        metal,
        `${toDisplayQuantity(metal, buyQty)} ${unit}`,
        `${toDisplayQuantity(metal, sellQty)} ${unit}`,
      ];
    })
    .filter((row): row is string[] => row !== null);

  const summaryStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: summaryStartY,
    head: [['Metal', 'Total Buy Qty', 'Total Sell Qty']],
    body: metalRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
    tableWidth: 100,
  });

  const totalsStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: totalsStartY,
    body: [
      ['Total Buy Amount', formatCurrencyPrecise(totalBuyAmount)],
      ['Total Sell Amount', formatCurrencyPrecise(totalSellAmount)],
      [
        difference >= 0 ? 'Profit' : 'Loss',
        formatCurrencyPrecise(Math.abs(difference)),
      ],
    ],
    styles: { fontSize: 9, fontStyle: 'bold' },
    tableWidth: 100,
    theme: 'plain',
  });

  doc.save(`transactions-${Date.now()}.pdf`);
}
