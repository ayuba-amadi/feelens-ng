import {
  BadgeDollarSign,
  BookOpenCheck,
  Building2,
  ExternalLink,
  FileClock,
  FileSearch,
  Gauge,
  History,
  Link2,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const navigation = [
  { to: '/admin', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/admin/mdas', label: 'MDAs', icon: Building2 },
  { to: '/admin/services', label: 'Services', icon: BookOpenCheck },
  { to: '/admin/fees', label: 'Fee options', icon: BadgeDollarSign },
  { to: '/admin/sources', label: 'Sources', icon: FileSearch },
  { to: '/admin/channels', label: 'Official channels', icon: Link2 },
  { to: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
  { to: '/admin/foi', label: 'Formal requests', icon: FileClock },
  { to: '/admin/audit-logs', label: 'Audit history', icon: History },
  { to: '/admin/users', label: 'Administrators', icon: Users },
];

function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="border-b border-white/10 px-5 py-4">
        <Link to="/admin" onClick={onNavigate} className="flex items-center gap-3 rounded-lg focus-visible:outline-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf font-black">F</span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight">FeeLens NG</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Administration</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Administration">
        <ul className="space-y-1">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-white text-navy' : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/" onClick={onNavigate} className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View public site
        </Link>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const current = navigation.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Sidebar /></aside>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-navy/50" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-[min(19rem,86vw)] shadow-2xl">
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-navy lg:hidden" aria-label="Open administration navigation" aria-expanded={menuOpen}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-navy">{current?.label || 'Administration'}</p>
              <p className="truncate text-xs text-slate-500">Protected management workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/admin/account" className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-3">
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden max-w-40 truncate sm:block">{user?.displayName || user?.email}</span>
            </Link>
            <button type="button" onClick={logout} className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-red-700" aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
