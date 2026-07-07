import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={clsx('animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800', className)} />;
}

export function SkeletonCards({ count = 4 }: { count?: number }): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}
