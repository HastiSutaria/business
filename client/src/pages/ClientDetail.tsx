import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, HandCoins, Pencil, Phone, MapPin } from 'lucide-react';
import { useClientLedgerQuery } from '@/hooks/useClients';
import { useClientReportQuery } from '@/hooks/useReports';
import { Modal } from '@/components/ui/Modal';
import { SettlementForm } from '@/components/settlements/SettlementForm';
import { ClientForm } from '@/components/clients/ClientForm';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatCurrencyPrecise, formatDate } from '@/utils/format';

export default function ClientDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useClientLedgerQuery(id);
  const { data: report } = useClientReportQuery(id);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading || !data) {
    return <SkeletonRows count={8} />;
  }

  const { client, ledger, outstanding } = data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link to="/clients" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{client.clientName}</h1>
          <p className="text-xs text-gray-400 truncate">{client.businessName}</p>
        </div>
        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
          <Pencil size={14} /> Edit
        </button>
        <button className="btn-primary" onClick={() => setSettlementOpen(true)}>
          <HandCoins size={14} /> Settle
        </button>
      </div>

      <div className="card p-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <Phone size={14} /> {client.mobile}
        </div>
        {client.address && (
          <div className="flex items-center gap-2 text-gray-500">
            <MapPin size={14} /> {client.address}
          </div>
        )}
        {client.gst && <div className="text-gray-500">GST: {client.gst}</div>}
        {client.notes && <div className="text-gray-500 italic">"{client.notes}"</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Current Outstanding"
          value={formatCurrency(Math.abs(outstanding))}
          subtext={outstanding >= 0 ? 'Receivable (they owe us)' : 'Payable (we owe them)'}
          tone={outstanding >= 0 ? 'profit' : 'loss'}
        />
        <StatCard label="Total Buy" value={formatCurrency(report?.totalBuy ?? 0)} tone="loss" />
        <StatCard label="Total Sell" value={formatCurrency(report?.totalSell ?? 0)} tone="profit" />
        <StatCard
          label="Client Profit Contribution"
          value={formatCurrency(report?.profit ?? 0)}
          tone={(report?.profit ?? 0) >= 0 ? 'profit' : 'loss'}
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Client Ledger</h3>
        {ledger.length === 0 ? (
          <EmptyState title="No ledger entries yet" description="Transactions and settlements will appear here." />
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Transaction</th>
                  <th className="py-2 pr-3 font-medium text-right">Credit</th>
                  <th className="py-2 pr-3 font-medium text-right">Debit</th>
                  <th className="py-2 pl-3 font-medium text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-gray-500">{formatDate(entry.date)}</td>
                    <td className="py-2.5 pr-3">{entry.description}</td>
                    <td className="py-2.5 pr-3 text-right text-profit">
                      {entry.credit > 0 ? formatCurrencyPrecise(entry.credit) : '-'}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-loss">
                      {entry.debit > 0 ? formatCurrencyPrecise(entry.debit) : '-'}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-semibold whitespace-nowrap">
                      {formatCurrencyPrecise(Math.abs(entry.runningBalance))}{' '}
                      <span className="text-xs font-normal text-gray-400">
                        {entry.runningBalance >= 0 ? 'Recv' : 'Pay'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={settlementOpen} onClose={() => setSettlementOpen(false)} title="Settle Payment">
        <SettlementForm defaultClientId={client.id} onDone={() => setSettlementOpen(false)} />
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client">
        <ClientForm client={client} onDone={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}
