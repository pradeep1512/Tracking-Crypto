'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  ShoppingCart,
  Bell,
  Settings,
  BarChart3,
  Zap,
  Shield,
  LogOut,
  Coins,
  Layers,
  Briefcase,
  PlayCircle,
  Calendar,
  Flame,
  Wallet,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/crypto', label: 'Crypto Markets', icon: Coins },
  { href: '/dashboard/options', label: 'Crypto Options', icon: Layers },
  { href: '/dashboard/portfolio', label: 'My Portfolio', icon: Briefcase },
  { href: '/dashboard/active-trading', label: 'Active Trading', icon: PlayCircle },
  { href: '/dashboard/orders', label: 'Orders / Trade History', icon: ShoppingCart },
  { href: '/dashboard/markets', label: 'Watchlist', icon: Activity },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/wallet', label: 'My Wallet', icon: Wallet },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role?.toUpperCase() === 'ADMIN';

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-yellow-500/10 bg-[#08080a]">
      {/* Logo */}
      <div className="p-6 border-b border-yellow-500/10 relative overflow-hidden">
        {/* Subtle cyber yellow corner accent */}
        <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-yellow-400 to-transparent" />
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #FFE600 0%, #EAB308 100%)', boxShadow: '0 0 15px rgba(250, 204, 21, 0.4)' }}
          >
            <Zap className="w-4 h-4 text-black fill-black" />
          </div>
          <span className="text-lg font-black tracking-wider">
            <span className="gradient-text uppercase">Tracking</span>
            <span className="text-white uppercase ml-0.5">Crypt</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                isActive
                  ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/40 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:border-l-2 hover:border-yellow-400/50'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-yellow-400' : 'text-zinc-400')} />
              <span>{item.label}</span>
              {item.label === 'Alerts' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-yellow-400 pulse-dot shadow-[0_0_8px_#FFE600]" />
              )}
            </Link>
          );
        })}

        {/* Admin portal nav if user is admin */}
        {isAdmin && (
          <div className="pt-2 mt-2 border-t border-yellow-500/10">
            <Link
              href="/admin/dashboard"
              id="nav-admin-dashboard"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                pathname.startsWith('/admin')
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                  : 'text-zinc-400 hover:text-yellow-300 hover:bg-yellow-500/10'
              )}
            >
              <Shield className="w-4 h-4 text-yellow-400" />
              <span>Admin Terminal</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 pb-6 border-t border-yellow-500/10 space-y-2.5">
        <button
          id="sidebar-signout-btn"
          onClick={() => signOut({ callbackUrl: '/signin?logout=true' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400/80" />
          <span>Sign Out</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <span className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot flex-shrink-0 shadow-[0_0_6px_#FFE600]" />
          <span className="text-yellow-400 text-[11px] font-bold tracking-tight truncate">Dev Mode — Delta Exchange Feeds</span>
        </div>
      </div>
    </aside>
  );
}
