import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { FAB } from '@/components/layout/FAB';
import { Modal } from '@/components/ui/Modal';
import { TransactionForm } from '@/components/transactions/TransactionForm';

export function AppLayout(): JSX.Element {
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:ml-60">
        <TopBar />
        <main className="px-4 md:px-6 py-5 pb-28 md:pb-10 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <FAB onClick={() => setAddTransactionOpen(true)} />

      <Modal open={addTransactionOpen} onClose={() => setAddTransactionOpen(false)} title="Add Transaction">
        <TransactionForm onDone={() => setAddTransactionOpen(false)} />
      </Modal>
    </div>
  );
}
