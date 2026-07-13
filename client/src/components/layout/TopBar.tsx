import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Search, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function TopBar(): JSX.Element {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 h-16 px-4 md:px-6 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800 md:ml-60">
      <div className="md:hidden flex items-center gap-2">
        <div className="rounded-lg bg-gold-500 p-1.5 text-white text-xs font-bold">HJ</div>
        <span className="font-bold text-sm">Hasti Jewellers</span>
      </div>
      <button
        onClick={() => navigate('/search')}
        className="hidden md:flex flex-1 max-w-md items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3.5 py-2 text-sm text-gray-400 hover:border-gold-300 transition"
      >
        <Search size={16} />
        Search clients, transactions, amounts...
      </button>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigate('/search')}
          className="md:hidden rounded-full p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-full p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="md:hidden rounded-full p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </button>
        <button
          onClick={() => setLogoutOpen(true)}
          className="rounded-full p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={20} />
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}
