import { useState } from 'react';
import { useMetalReportQuery, useProfitReportQuery } from '@/hooks/useReports';
import { ReportPreset } from '@/services/reports.service';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { formatCurrency, formatCurrencyPrecise, formatDate, formatQuantity } from '@/utils/format';

const PRESETS: Array<{ value: ReportPreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export default function Reports(): JSX.Element {
  const [preset, setPreset] = useState<ReportPreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const useCustom = Boolean(customFrom && customTo);

  const params = useCustom ? { from: customFrom, to: customTo } : { preset };

  const { data: profit, isLoading: profitLoading } = useProfitReportQuery(params);
  const { data: metal, isLoading: metalLoading } = useMetalReportQuery(params);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-gray-400">Profit & Loss, gold and silver performance</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPreset(p.value);
                setCustomFrom('');
                setCustomTo('');
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border ${
                !useCustom && preset === p.value
                  ? 'bg-gold-500 border-gold-500 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" className="input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      </div>

      {profitLoading || !profit ? (
        <SkeletonCards count={7} />
      ) : (
        <div>
          <h2 className="text-sm font-semibold mb-3">Profit & Loss</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Buy" value={formatCurrency(profit.totalBuy)} tone="loss" />
            <StatCard label="Total Sell" value={formatCurrency(profit.totalSell)} tone="profit" />
            <StatCard
              label="Net Profit"
              value={formatCurrency(profit.netProfit)}
              tone={profit.netProfit >= 0 ? 'profit' : 'loss'}
            />
            <StatCard label="Number of Trades" value={String(profit.numberOfTrades)} />
            <StatCard label="Average Rate" value={formatCurrencyPrecise(profit.averageRate)} />
            <StatCard
              label="Highest Transaction"
              value={profit.highestTransaction ? formatCurrencyPrecise(profit.highestTransaction.amount) : '-'}
              subtext={profit.highestTransaction ? formatDate(profit.highestTransaction.date) : undefined}
            />
            <StatCard
              label="Lowest Transaction"
              value={profit.lowestTransaction ? formatCurrencyPrecise(profit.lowestTransaction.amount) : '-'}
              subtext={profit.lowestTransaction ? formatDate(profit.lowestTransaction.date) : undefined}
            />
          </div>
        </div>
      )}

      {metalLoading || !metal ? (
        <SkeletonCards count={5} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 text-gold-600 dark:text-gold-400">🟡 Gold Report</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MetricRow label="Buy Quantity" value={formatQuantity(metal.gold.buyQuantity)} />
              <MetricRow label="Sell Quantity" value={formatQuantity(metal.gold.sellQuantity)} />
              <MetricRow label="Net Position" value={formatQuantity(metal.gold.netPosition)} />
              <MetricRow
                label="Profit"
                value={formatCurrency(metal.gold.profit)}
                tone={metal.gold.profit >= 0 ? 'text-profit' : 'text-loss'}
              />
              <MetricRow label="Average Rate" value={formatCurrencyPrecise(metal.gold.averageRate)} />
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 text-silver-600 dark:text-silver-300">⚪ Silver Report</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MetricRow label="Buy Quantity" value={formatQuantity(metal.silver.buyQuantity)} />
              <MetricRow label="Sell Quantity" value={formatQuantity(metal.silver.sellQuantity)} />
              <MetricRow label="Net Position" value={formatQuantity(metal.silver.netPosition)} />
              <MetricRow
                label="Profit"
                value={formatCurrency(metal.silver.profit)}
                tone={metal.silver.profit >= 0 ? 'text-profit' : 'text-loss'}
              />
              <MetricRow label="Average Rate" value={formatCurrencyPrecise(metal.silver.averageRate)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, tone }: { label: string; value: string; tone?: string }): JSX.Element {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-semibold ${tone ?? ''}`}>{value}</p>
    </div>
  );
}
