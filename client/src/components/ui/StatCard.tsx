import { ReactNode } from 'react';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: 'default' | 'profit' | 'loss' | 'gold' | 'silver';
  subtext?: string;
}

const TONE_STYLES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-gray-900 dark:text-gray-100',
  profit: 'text-profit',
  loss: 'text-loss',
  gold: 'text-gold-600 dark:text-gold-400',
  silver: 'text-silver-600 dark:text-silver-300',
};

const ICON_BG: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
  profit: 'bg-profit/10 text-profit',
  loss: 'bg-loss/10 text-loss',
  gold: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
  silver: 'bg-silver-100 dark:bg-silver-800/30 text-silver-600 dark:text-silver-300',
};

export function StatCard({ label, value, icon, tone = 'default', subtext }: StatCardProps): JSX.Element {
  return (
    <div className="card p-4 flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        {icon && <span className={clsx('rounded-lg p-1.5', ICON_BG[tone])}>{icon}</span>}
      </div>
      <span className={clsx('text-xl font-bold tracking-tight', TONE_STYLES[tone])}>{value}</span>
      {subtext && <span className="text-xs text-gray-400">{subtext}</span>}
    </div>
  );
}
