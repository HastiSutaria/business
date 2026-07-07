import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ArrowUpDown, Trash2, Pencil, ChevronRight } from 'lucide-react';
import { useClientsQuery, useDeleteClient } from '@/hooks/useClients';
import { useDebounce } from '@/hooks/useDebounce';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ClientForm } from '@/components/clients/ClientForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { Client } from '@/types';
import { formatCurrency } from '@/utils/format';

type SortField = 'clientName' | 'openingBalance' | 'createdAt';

export default function Clients(): JSX.Element {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [sortField, setSortField] = useState<SortField>('clientName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [deletingClient, setDeletingClient] = useState<Client | undefined>(undefined);

  const { data: clients, isLoading } = useClientsQuery({
    search: debouncedSearch,
    sortBy: sortField,
    sortDir,
  });
  const deleteMutation = useDeleteClient();

  const sortOptions: Array<{ field: SortField; label: string }> = useMemo(
    () => [
      { field: 'clientName', label: 'Name' },
      { field: 'openingBalance', label: 'Opening Balance' },
      { field: 'createdAt', label: 'Recently Added' },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clients</h1>
          <p className="text-sm text-gray-400">Manage your trading partners</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingClient(undefined);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Add Client
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, business, mobile or GST"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {sortOptions.map(({ field, label }) => (
            <button
              key={field}
              onClick={() => {
                if (sortField === field) {
                  setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortField(field);
                  setSortDir('asc');
                }
              }}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                sortField === field
                  ? 'bg-gold-500 border-gold-500 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              {label} <ArrowUpDown size={12} />
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows count={6} />
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="Add a client to start recording buy/sell transactions."
          action={
            <button className="btn-primary" onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Add Client
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((client) => (
            <div key={client.id} className="card p-4 flex items-center gap-3">
              <Link to={`/clients/${client.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 flex items-center justify-center font-bold shrink-0">
                  {client.clientName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{client.clientName}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {client.businessName} &middot; {client.mobile}
                  </p>
                </div>
              </Link>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs text-gray-400">Opening Balance</p>
                <p className="text-sm font-semibold">{formatCurrency(client.openingBalance)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    setEditingClient(client);
                    setFormOpen(true);
                  }}
                  aria-label="Edit client"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="rounded-full p-2 hover:bg-loss/10 text-loss"
                  onClick={() => setDeletingClient(client)}
                  aria-label="Delete client"
                >
                  <Trash2 size={16} />
                </button>
                <Link to={`/clients/${client.id}`} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingClient ? 'Edit Client' : 'Add Client'}
      >
        <ClientForm client={editingClient} onDone={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingClient)}
        title="Delete Client"
        message={`Are you sure you want to delete "${deletingClient?.clientName}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingClient(undefined)}
        onConfirm={() => {
          if (!deletingClient) return;
          deleteMutation.mutate(deletingClient.id, { onSuccess: () => setDeletingClient(undefined) });
        }}
      />
    </div>
  );
}
