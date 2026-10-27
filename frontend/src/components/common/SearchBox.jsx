import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MIN_PUBLIC_SEARCH_LENGTH, publicApi } from '../../lib/api';
import { valueOf } from '../../lib/format';
import { SearchEmptyState } from './States';

function resultLink(result) {
  const type = String(valueOf(result, 'type', 'recordType') || '').toLowerCase();
  const slug = valueOf(result, 'slug');
  if (!slug) return null;
  return type.includes('mda') ? `/mdas/${slug}` : `/services/${slug}`;
}

function resultTypeLabel(result) {
  const type = String(valueOf(result, 'type', 'recordType') || '').toLowerCase();
  if (type.includes('mda')) return 'MDA';
  const mdaName = valueOf(result, 'mdaName', 'mda_name');
  return mdaName ? `Service · ${mdaName}` : 'Service';
}

export function SearchBox({ id = 'public-search', label = 'Search services and MDAs', initialValue = '', onSubmit, compact = false }) {
  const [term, setTerm] = useState(initialValue);
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [], error: null });

  useEffect(() => { setTerm(initialValue); }, [initialValue]);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setSubmittedTerm('');
      setState({ status: 'idle', results: [], error: null });
      return;
    }
    if (cleanTerm.length < MIN_PUBLIC_SEARCH_LENGTH) {
      setSubmittedTerm(cleanTerm);
      setState({ status: 'too_short', results: [], error: null });
      return;
    }
    setSubmittedTerm(cleanTerm);
    setState({ status: 'loading', results: [], error: null });
    try {
      const results = await publicApi.searchPublic(cleanTerm);
      setState({ status: 'success', results: Array.isArray(results) ? results : [], error: null });
      onSubmit?.(cleanTerm, results);
    } catch (error) {
      setState({ status: 'error', results: [], error });
    }
  }

  return <div className="w-full">
    <form className="flex flex-col gap-2 sm:flex-row" role="search" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="relative min-w-0 flex-1"><Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id={id} value={term} onChange={(event) => setTerm(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:border-leaf focus:outline-none" placeholder="Search an MDA, service or acronym" autoComplete="off" />{term ? <button type="button" className="absolute right-2 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Clear search" onClick={() => { setTerm(''); setSubmittedTerm(''); setState({ status: 'idle', results: [], error: null }); }}><X size={16} /></button> : null}</div>
      <button className="primary-button min-h-12 shrink-0" type="submit"><Search size={17} aria-hidden="true" /> Search</button>
    </form>
    {state.status === 'loading' ? <p className="mt-3 text-sm text-slate-600" role="status">Searching public records…</p> : null}
    {state.status === 'too_short' ? <p className="mt-3 text-sm text-slate-600" role="status">Enter at least {MIN_PUBLIC_SEARCH_LENGTH} characters to search public records.</p> : null}
    {state.status === 'error' ? <p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">Search is temporarily unavailable. Please try again shortly.</p> : null}
    {state.status === 'success' ? <div className={`mt-3 rounded-2xl border border-slate-200 bg-white p-3 ${compact ? '' : 'shadow-sm'}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Results for “{submittedTerm}”</p><span className="text-xs text-slate-500">{state.results.length} found</span></div>{state.results.length === 0 ? <div className="mt-3"><SearchEmptyState /></div> : <div className="mt-2 divide-y divide-slate-100">{state.results.slice(0, 6).map((result, index) => { const href = resultLink(result); return href ? <Link key={`${href}-${index}`} to={href} className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm hover:text-leaf"><span className="min-w-0"><span className="block truncate font-bold text-ink">{valueOf(result, 'name', 'title') || 'Unnamed public record'}</span><span className="block truncate text-xs text-slate-500">{resultTypeLabel(result)}</span></span><span className="shrink-0 text-xs font-bold text-leaf">View</span></Link> : null; })}</div>}</div> : null}
  </div>;
}

