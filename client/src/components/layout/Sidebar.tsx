import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Coins } from 'lucide-react';
import { primaryNavItems, secondaryNavItems } from './navItems';

export function Sidebar(): JSX.Element {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100 dark:border-gray-800">
        <div className="rounded-xl bg-gold-500 p-2 text-white">
          <Coins size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-sm">Hasti Jewellers</p>
          <p className="text-[11px] text-gray-400">Gold & Silver Trading</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {primaryNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gold-50 text-gold-700 dark:bg-gold-900/20 dark:text-gold-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
        {secondaryNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gold-50 text-gold-700 dark:bg-gold-900/20 dark:text-gold-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
