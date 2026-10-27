import { RotateCcw } from 'lucide-react';

export function MdaFilters({ filters, setFilters, onReset }) {
  return <div className="surface-card flex flex-wrap items-end gap-3 p-4"><label className="block min-w-0 flex-1 text-xs font-bold text-slate-600" htmlFor="sort">Sort<select id="sort" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink focus:border-leaf focus:outline-none"><option value="coverage">Publication priority</option><option value="alpha">A–Z</option><option value="live">Live / available first</option><option value="services">Mapped services</option></select></label><button type="button" onClick={onReset} className="text-button min-h-11"><RotateCcw size={15} aria-hidden="true" />Reset</button></div>;
}
