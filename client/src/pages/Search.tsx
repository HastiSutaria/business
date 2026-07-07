import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useSearch';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetalBadge, TypeBadge } from '@/components/ui/Badge';
import { formatCurrencyPrecise, formatDate } from '@/utils/format';

export default function SearchPage(): JSX.Element {
  const [query, setQuery] = useState('');
  const { data, isFetching } = useGlobalSearch(query);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Global Search</h1>
        <p className="text-sm text-gray-400">Search clients, amounts, metals, rates, remarks or dates</p>
      </div>

      <div className="relative">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          className="input pl-10 text-base"
          placeholder="Type to search instantly..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!query.trim() ? (
        <EmptyState title="Start typing to search" description="Results update instantly as you type." />
      ) : isFetching ? (
        <p className="text-sm text-gray-400 text-center py-8">Searching...</p>
      ) : !data || (data.clients.length === 0 && data.transactions.length === 0) ? (
        <EmptyState title="No results found" description={`Nothing matched "${query}"`} />
      ) : (
        <div className="flex flex-col gap-6">
          {data.clients.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Clients ({data.clients.length})</h3>
              <div className="flex flex-col gap-2">
                {data.clients.map((c) => (
                  <Link key={c.id} to={`/clients/${c.id}`} className="card p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.clientName}</p>
                      <p className="text-xs text-gray-400">
                        {c.businessName} &middot; {c.mobile}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.transactions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Transactions ({data.transactions.length})</h3>
              <div className="flex flex-col gap-2">
                {data.transactions.map((t) => (
                  <div key={t.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MetalBadge metal={t.metal} />
                      <TypeBadge type={t.type} />
                      <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                    </div>
                    <span className="font-semibold">{formatCurrencyPrecise(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
