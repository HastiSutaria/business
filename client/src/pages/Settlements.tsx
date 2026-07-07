import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { useClientsOutstandingQuery, useClientPendingTransactionsQuery } from '@/hooks/useClients';
import { useCreateSettlement } from '@/hooks/useSettlements';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { MetalBadge, TypeBadge } from '@/components/ui/Badge';
import { formatCurrencyPrecise, formatDate, formatNumber, todayIso } from '@/utils/format';
import { toDisplayQuantity, toDisplayRate, quantityUnit } from '@/utils/units';
import { ClientOutstanding } from '@/services/clients.service';

function PendingTransactionsPanel({ clientId }: { clientId: string }): JSX.Element {
  const { data, isLoading } = useClientPendingTransactionsQuery(clientId, true);

  if (isLoading || !data) {
    return <SkeletonRows count={3} />;
  }

  if (data.transactions.length === 0) {
    return <p className="text-sm text-gray-400 py-2">No pending transactions for this client.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-800/60">
        {data.transactions.map((t) => {
          const unit = quantityUnit(t.metal);
          const quantity = toDisplayQuantity(t.metal, t.quantity);
          const rate = toDisplayRate(t.metal, t.rate);
          return (
            <div key={t.id} className="py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MetalBadge metal={t.metal} />
                  <TypeBadge type={t.type} />
                </div>
                <p className="text-xs text-gray-400">
                  {formatDate(t.date)} &middot; {formatNumber(quantity)}
                  {unit} @ ₹{formatNumber(rate)}/{unit}
                </p>
              </div>
              <span className="font-semibold text-sm shrink-0">{formatCurrencyPrecise(t.amount)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="text-sm font-semibold">Final Amount</span>
        <span className={`font-bold ${data.outstanding > 0 ? 'text-profit' : 'text-loss'}`}>
          {formatCurrencyPrecise(Math.abs(data.outstanding))}{' '}
          <span className="text-xs font-normal text-gray-400">
            {data.outstanding > 0 ? 'To receive' : 'To pay'}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function Settlements(): JSX.Element {
  const [search, setSearch] = useState('');
  const { data: balances, isLoading } = useClientsOutstandingQuery();
  const [settling, setSettling] = useState<ClientOutstanding | undefined>(undefined);
  const [expandedClientId, setExpandedClientId] = useState<string | undefined>(undefined);
  const createMutation = useCreateSettlement();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = balances ?? [];
    if (!q) return list;
    return list.filter(
      ({ client }) => client.clientName.toLowerCase().includes(q) || client.businessName.toLowerCase().includes(q)
    );
  }, [balances, search]);

  const handleSettle = () => {
    if (!settling) return;
    createMutation.mutate(
      {
        clientId: settling.client.id,
        amount: Math.abs(settling.outstanding),
        paymentMode: 'CASH',
        date: todayIso(),
        remarks: 'Full settlement',
      },
      { onSuccess: () => setSettling(undefined) }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Settlements</h1>
        <p className="text-sm text-gray-400">Outstanding balance by client</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search clients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <SkeletonRows count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No clients found" description="Add a client to start tracking settlements." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(({ client, outstanding }) => {
            const settled = Math.round(outstanding * 100) === 0;
            const expanded = expandedClientId === client.id;
            return (
              <div key={client.id} className="card overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full p-4 flex items-center gap-3 text-left cursor-pointer"
                  onClick={() => setExpandedClientId(expanded ? undefined : client.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    setExpandedClientId(expanded ? undefined : client.id);
                  }}
                  aria-expanded={expanded}
                >
                  <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 flex items-center justify-center font-bold shrink-0">
                    {client.clientName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{client.clientName}</p>
                    <p className="text-xs text-gray-400 truncate">{client.businessName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {settled ? (
                      <p className="text-sm font-medium text-gray-400">Settled</p>
                    ) : (
                      <>
                        <p className={`font-bold ${outstanding > 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrencyPrecise(Math.abs(outstanding))}
                        </p>
                        <p className="text-xs text-gray-400">{outstanding > 0 ? 'To receive' : 'To pay'}</p>
                      </>
                    )}
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                  <button
                    className={`rounded-full p-2 shrink-0 transition ${
                      settled
                        ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                        : 'text-profit hover:bg-profit/10'
                    }`}
                    aria-label="Settle"
                    disabled={settled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettling({ client, outstanding });
                    }}
                  >
                    <CheckCircle2 size={22} />
                  </button>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                    <PendingTransactionsPanel clientId={client.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(settling)}
        title="Settle Payment"
        message={
          settling
            ? `Mark ${settling.client.clientName} as fully settled for ${formatCurrencyPrecise(
                Math.abs(settling.outstanding)
              )} (${settling.outstanding > 0 ? 'received' : 'paid'})?`
            : ''
        }
        confirmLabel="Settle"
        loading={createMutation.isPending}
        onConfirm={handleSettle}
        onCancel={() => setSettling(undefined)}
      />
    </div>
  );
}
