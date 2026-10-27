import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { publicApi } from '../lib/api';
import { useApiResource } from '../hooks/use-api';
import { formatCount, valueOf } from '../lib/format';
import { MdaCard } from '../components/mda/MdaCard';
import { MdaFilters } from '../components/mda/MdaFilters';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { PageIntro } from '../components/common/PageIntro';

const initialFilters = { search: '', jurisdiction: '', entityType: '', coverageStatus: '', category: '', sort: 'coverage', page: 1 };

export function MdasPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [searchDraft, setSearchDraft] = useState('');
  const [retry, setRetry] = useState(0);
  const [loadedItems, setLoadedItems] = useState([]);
  const queryKey = JSON.stringify(filters);
  const state = useApiResource((options) => publicApi.getMdas(filters, options), [queryKey, retry]);
  const pageItems = state.status === 'success' ? state.data?.items || [] : [];

  useEffect(() => {
    setLoadedItems([]);
  }, [JSON.stringify({ ...filters, page: 1 }), retry]);

  useEffect(() => {
    if (state.status !== 'success' || (state.data?.page !== undefined && state.data.page !== filters.page)) return;
    setLoadedItems((current) => filters.page === 1 ? pageItems : [...current, ...pageItems]);
  }, [state.status, state.data, filters.page]);

  const items = state.status === 'success' ? loadedItems : [];


  function submitSearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: searchDraft.trim(), page: 1 }));
  }

  function resetFilters() {
    setSearchDraft('');
    setFilters(initialFilters);
  }

  return <div className="page-shell space-y-6 py-6 sm:py-8"><PageIntro eyebrow="Public catalogue" title="Browse MDAs and their services" description="Start with the public body, then move through its services to the fee, evidence, and official channel." /><div className="surface-card p-4 sm:p-5"><form className="flex flex-col gap-2 sm:flex-row" role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="mda-search">Search MDAs</label><div className="relative min-w-0 flex-1"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="mda-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm placeholder:text-slate-400 focus:border-leaf focus:outline-none" placeholder="Search an MDA, acronym, or category" /></div><button className="primary-button min-h-12" type="submit"><Search size={17} aria-hidden="true" />Search catalogue</button></form></div><MdaFilters filters={filters} setFilters={setFilters} onReset={resetFilters} /><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">{state.status === 'success' ? `${formatCount(state.data?.total ?? items.length)} result${(state.data?.total ?? items.length) === 1 ? '' : 's'}` : 'Public results'}</p>{filters.search ? <p className="text-xs text-slate-500">Showing results for “{filters.search}”</p> : null}</div><h2 className="sr-only">MDA results</h2>{state.status === 'loading' ? <LoadingState label="Loading MDA catalogue…" /> : state.status === 'error' ? <ErrorState title="The MDA catalogue is not available yet" description="The public API did not return catalogue data. Try again when public records are connected." onRetry={() => setRetry((current) => current + 1)} /> : items.length === 0 ? <EmptyState title="No public MDA records yet" description="The catalogue is ready for verified records, but none are available to display yet." /> : <><div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((mda, index) => <MdaCard key={valueOf(mda, 'id', 'slug') || index} mda={mda} />)}</div>{state.data?.hasMore ? <div className="flex justify-center"><button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Load more</button></div> : null}</>}</div>;
}

