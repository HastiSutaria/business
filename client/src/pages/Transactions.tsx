import { useMemo, useState } from 'react';
import { Copy, Download, FileText, Filter, Pencil, Trash2, Undo2 } from 'lucide-react';
import { useClientsQuery } from '@/hooks/useClients';
import {
  useDeleteTransaction,
  useDuplicateTransaction,
  useTransactionsQuery,
  useUndoDeleteTransaction,
} from '@/hooks/useTransactions';
import { useDebounce } from '@/hooks/useDebounce';
import { TransactionFilters } from '@/services/transactions.service';
import { transactionsApi } from '@/services/transactions.service';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { MetalBadge, TypeBadge } from '@/components/ui/Badge';
import { Transaction } from '@/types';
import { formatCurrencyPrecise, formatDate, formatNumber } from '@/utils/format';
import { toDisplayQuantity, toDisplayRate, quantityUnit } from '@/utils/units';
import { exportTransactionsToPdf } from '@/utils/exportPdf';
import { useToast } from '@/contexts/ToastContext';

const DATE_PRESETS: Array<{ value: TransactionFilters['datePreset']; label: string }> = [
  { value: undefined, label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function Transactions(): JSX.Element {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [metal, setMetal] = useState<TransactionFilters['metal']>(undefined);
  const [type, setType] = useState<TransactionFilters['type']>(undefined);
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<TransactionFilters['datePreset']>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | undefined>(undefined);
  const [lastDeletedId, setLastDeletedId] = useState<string | undefined>(undefined);

  const filters: TransactionFilters = useMemo(
    () => ({ search: debouncedSearch || undefined, metal, type, clientId, datePreset, page, pageSize: 20 }),
    [debouncedSearch, metal, type, clientId, datePreset, page]
  );

  const { data, isLoading } = useTransactionsQuery(filters);
  const { data: clients } = useClientsQuery();
  const deleteMutation = useDeleteTransaction();
  const duplicateMutation = useDuplicateTransaction();
  const undoMutation = useUndoDeleteTransaction();
  const { showToast } = useToast();

  const clientNameById = useMemo(() => new Map(clients?.map((c) => [c.id, c.clientName]) ?? []), [clients]);

  const activeFilterCount = [metal, type, clientId, datePreset].filter(Boolean).length;

  const handleExportPdf = (): void => {
    if (!data?.items.length) {
      showToast('No transactions to export', 'error');
      return;
    }
    exportTransactionsToPdf(data.items, clientNameById);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Transactions</h1>
          <p className="text-sm text-gray-400">{data?.total ?? 0} total records</p>
        </div>
        <div className="flex gap-2">
          <a href={transactionsApi.exportCsvUrl(filters)} className="btn-secondary" download>
            <Download size={14} /> CSV
          </a>
          <button className="btn-secondary" onClick={handleExportPdf}>
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Search remarks, amount, rate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={`btn-secondary shrink-0 ${activeFilterCount > 0 ? 'ring-2 ring-gold-400' : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter size={16} /> {activeFilterCount > 0 && activeFilterCount}
          </button>
        </div>

        {filtersOpen && (
          <div className="card p-4 flex flex-col gap-3 animate-fade-in">
            <div>
              <p className="label">Date Range</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setDatePreset(preset.value);
                      setPage(1);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${
                      datePreset === preset.value
                        ? 'bg-gold-500 border-gold-500 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label">Metal</p>
                <select
                  className="input"
                  value={metal ?? ''}
                  onChange={(e) => {
                    setMetal((e.target.value || undefined) as TransactionFilters['metal']);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="GOLD">Gold</option>
                  <option value="SILVER">Silver</option>
                </select>
              </div>
              <div>
                <p className="label">Type</p>
                <select
                  className="input"
                  value={type ?? ''}
                  onChange={(e) => {
                    setType((e.target.value || undefined) as TransactionFilters['type']);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>
            </div>
            <div>
              <p className="label">Client</p>
              <select
                className="input"
                value={clientId ?? ''}
                onChange={(e) => {
                  setClientId(e.target.value || undefined);
                  setPage(1);
                }}
              >
                <option value="">All Clients</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-secondary self-start"
              onClick={() => {
                setMetal(undefined);
                setType(undefined);
                setClientId(undefined);
                setDatePreset(undefined);
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows count={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No transactions found" description="Try adjusting your filters or add a new transaction." />
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((t) => {
            const unit = quantityUnit(t.metal);
            const quantity = toDisplayQuantity(t.metal, t.quantity);
            const rate = toDisplayRate(t.metal, t.rate);
            return (
            <div key={t.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MetalBadge metal={t.metal} />
                  <TypeBadge type={t.type} />
                </div>
                <p className="text-sm font-medium truncate">{clientNameById.get(t.clientId) ?? 'Unknown Client'}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(t.date)} {t.time} &middot; {formatNumber(quantity)}
                  {unit} @ ₹{formatNumber(rate)}/{unit}
                </p>
                {t.remarks && <p className="text-xs text-gray-400 italic truncate">{t.remarks}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="font-bold">{formatCurrencyPrecise(t.amount)}</span>
                <div className="flex gap-1">
                  <button
                    className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setEditingTxn(t)}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => duplicateMutation.mutate(t.id)}
                    aria-label="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="rounded-full p-1.5 hover:bg-loss/10 text-loss"
                    onClick={() => setDeletingTxn(t)}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}

          {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
        </div>
      )}

      {lastDeletedId && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg animate-slide-up">
          <span className="text-sm">Transaction deleted</span>
          <button
            className="flex items-center gap-1 text-xs font-semibold text-gold-400"
            onClick={() => {
              undoMutation.mutate(lastDeletedId);
              setLastDeletedId(undefined);
            }}
          >
            <Undo2 size={14} /> Undo
          </button>
        </div>
      )}

      <Modal open={Boolean(editingTxn)} onClose={() => setEditingTxn(undefined)} title="Edit Transaction">
        {editingTxn && <TransactionForm transaction={editingTxn} onDone={() => setEditingTxn(undefined)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingTxn)}
        title="Delete Transaction"
        message="This transaction will be removed and the client's ledger will be recalculated. You can undo within 30 seconds."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingTxn(undefined)}
        onConfirm={() => {
          if (!deletingTxn) return;
          const id = deletingTxn.id;
          deleteMutation.mutate(id, {
            onSuccess: () => {
              setDeletingTxn(undefined);
              setLastDeletedId(id);
              setTimeout(() => setLastDeletedId((current) => (current === id ? undefined : current)), 30000);
            },
          });
        }}
      />
    </div>
  );
}
