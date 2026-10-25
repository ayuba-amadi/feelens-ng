import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, Search, ShieldCheck, X } from 'lucide-react';

const navItems = [{ to: '/mdas', label: 'MDAs' }, { to: '/methodology', label: 'How it works' }, { to: '/about', label: 'About' }];

function Wordmark() {
  return <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-ink"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf text-white" aria-hidden="true"><ShieldCheck size={18} strokeWidth={2.5} /></span>FeeLens <span className="text-leaf">NG</span></span>;
}

function NavigationLink({ to, label, onClick }) {
  return <NavLink to={to} onClick={onClick} className={({ isActive }) => `rounded-lg px-2 py-2 text-sm font-semibold transition ${isActive ? 'bg-leaf/10 text-leaf' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`}>{label}</NavLink>;
}

export function SiteLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenu = () => setMobileOpen(false);
  return <div className="public-site min-h-screen bg-[#f7faf9] text-ink">
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="page-shell flex min-h-[4.25rem] items-center justify-between gap-4"><Link to="/" onClick={closeMenu} aria-label="FeeLens NG home"><Wordmark /></Link><nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">{navItems.map((item) => <NavigationLink key={item.to} {...item} />)}</nav><div className="hidden items-center gap-2 sm:flex"><Link className="secondary-button min-h-10 px-3" to="/#public-search"><Search size={16} aria-hidden="true" /> Verify a fee</Link></div><button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-ink hover:bg-slate-50 lg:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button></div>{mobileOpen ? <nav id="mobile-navigation" className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden" aria-label="Mobile navigation"><div className="page-shell flex flex-col gap-1 px-0"><Link className="primary-button mb-2 w-full" to="/#public-search" onClick={closeMenu}><Search size={16} aria-hidden="true" /> Verify a fee</Link>{navItems.map((item) => <NavigationLink key={item.to} {...item} onClick={closeMenu} />)}<NavigationLink to="/data-sources" label="Data sources" onClick={closeMenu} /></div></nav> : null}</header>
    <main className="pb-14"><Outlet /></main>
    <footer className="border-t border-slate-200 bg-white"><div className="page-shell flex flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between"><div><Link to="/" className="text-base font-black text-ink">FeeLens <span className="text-leaf">NG</span></Link><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Independent civic technology for checking public fees. Not a government platform or payment channel.</p></div><nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-600" aria-label="Footer navigation"><Link className="hover:text-leaf" to="/mdas">MDAs</Link><Link className="hover:text-leaf" to="/methodology">How it works</Link><Link className="hover:text-leaf" to="/data-sources">Data sources</Link><Link className="hover:text-leaf" to="/policy">Policy</Link><Link className="hover:text-leaf" to="/about">About</Link><Link className="hover:text-leaf" to="/privacy">Privacy</Link></nav></div></footer>
  </div>;
}

