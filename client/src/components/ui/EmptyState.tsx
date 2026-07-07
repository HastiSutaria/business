import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 gap-3">
      {icon && <div className="text-gray-300 dark:text-gray-700">{icon}</div>}
      <h3 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
