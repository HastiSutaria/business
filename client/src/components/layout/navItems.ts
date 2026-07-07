import { LayoutDashboard, Repeat, Users, HandCoins, BarChart3, Settings as SettingsIcon, LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settlements', label: 'Settlements', icon: HandCoins },
  { to: '/transactions', label: 'Transactions', icon: Repeat },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export const secondaryNavItems: NavItem[] = [{ to: '/settings', label: 'Settings', icon: SettingsIcon }];
