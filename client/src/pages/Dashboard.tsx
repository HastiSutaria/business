import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, Coins, Gem, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useDashboardQuery } from '@/hooks/useReports';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonCards, SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetalBadge, TypeBadge } from '@/components/ui/Badge';
import { formatCurrency, formatCurrencyPrecise, formatDate, formatQuantity, formatQuantityKg } from '@/utils/format';

const CHART_COLORS = { gold: '#d99417', silver: '#8592a1', profit: '#16a34a', loss: '#dc2626' };

export default function Dashboard(): JSX.Element {
  const { data: stats, isLoading } = useDashboardQuery();

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonCards count={8} />
        <SkeletonRows count={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-400">Live overview of today's trading business</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Today's Profit/Loss"
          value={formatCurrency(stats.todayProfit)}
          tone={stats.todayProfit >= 0 ? 'profit' : 'loss'}
          icon={stats.todayProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard
          label="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          tone={stats.totalProfit >= 0 ? 'profit' : 'loss'}
          icon={<Wallet size={16} />}
        />
        <StatCard
          label="To Receive"
          value={formatCurrency(stats.outstandingReceivable)}
          tone="profit"
          icon={<ArrowDownCircle size={16} />}
        />
        <StatCard
          label="To Pay"
          value={formatCurrency(stats.outstandingPayable)}
          tone="loss"
          icon={<ArrowUpCircle size={16} />}
        />
        <StatCard
          label="Gold Quantity (Net)"
          value={formatQuantity(stats.goldQuantity)}
          tone="gold"
          icon={<Coins size={16} />}
        />
        <StatCard
          label="Silver Quantity (Net)"
          value={formatQuantityKg(stats.silverQuantity)}
          tone="silver"
          icon={<Gem size={16} />}
        />
        <StatCard label="Today's Buy Amount" value={formatCurrency(stats.todayBuyAmount)} tone="loss" />
        <StatCard label="Today's Sell Amount" value={formatCurrency(stats.todaySellAmount)} tone="profit" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs font-medium text-gold-600 dark:text-gold-400">
              View all
            </Link>
          </div>
          {stats.recentTransactions.length === 0 ? (
            <EmptyState title="No transactions yet" description="Add your first buy/sell transaction to get started." />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {stats.recentTransactions.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MetalBadge metal={t.metal} />
                    <TypeBadge type={t.type} />
                    <span className="text-xs text-gray-400 truncate">{formatDate(t.date)}</span>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCurrencyPrecise(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Top Clients</h3>
          {stats.topClients.length === 0 ? (
            <EmptyState title="No client activity" />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {stats.topClients.map((c) => (
                <Link
                  key={c.clientId}
                  to={`/clients/${c.clientId}`}
                  className="py-2.5 flex items-center justify-between gap-3 hover:opacity-80"
                >
                  <span className="text-sm font-medium truncate">{c.clientName}</span>
                  <span className="text-xs font-semibold text-gray-500">{formatCurrency(c.totalAmount)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {(stats.goldQuantity !== 0 || stats.silverQuantity !== 0) && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Metal Distribution (Net Position)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Gold', value: Math.abs(stats.goldQuantity) },
                  { name: 'Silver', value: Math.abs(stats.silverQuantity) },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
              >
                <Cell fill={CHART_COLORS.gold} />
                <Cell fill={CHART_COLORS.silver} />
              </Pie>
              <Legend />
              <Tooltip formatter={(v: number) => formatQuantity(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
