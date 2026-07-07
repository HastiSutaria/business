import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-label="Add transaction"
      className="fixed z-40 right-5 bottom-20 md:bottom-8 md:right-8 flex items-center gap-2 rounded-full bg-gold-500 text-white shadow-lg shadow-gold-500/30 px-5 py-4 active:scale-95 transition hover:bg-gold-600"
    >
      <Plus size={22} />
      <span className="hidden md:inline text-sm font-semibold pr-1">Add Transaction</span>
    </button>
  );
}
