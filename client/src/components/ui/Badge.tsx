import clsx from 'clsx';
import { Metal, TransactionType } from '@/types';

export function MetalBadge({ metal }: { metal: Metal }): JSX.Element {
  return (
    <span
      className={clsx(
        'chip',
        metal === 'GOLD'
          ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400'
          : 'bg-silver-100 text-silver-700 dark:bg-silver-800/30 dark:text-silver-300'
      )}
    >
      {metal === 'GOLD' ? '🟡 Gold' : '⚪ Silver'}
    </span>
  );
}

export function TypeBadge({ type }: { type: TransactionType }): JSX.Element {
  return (
    <span
      className={clsx(
        'chip',
        type === 'BUY'
          ? 'bg-profit/10 text-profit'
          : 'bg-loss/10 text-loss'
      )}
    >
      {type}
    </span>
  );
}
