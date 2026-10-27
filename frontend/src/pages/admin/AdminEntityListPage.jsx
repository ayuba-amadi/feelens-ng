import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';
import { formatDate } from '../../lib/format';

const configs = {
  mdas: {
    title: 'MDAs', description: 'Manage institutions covered by FeeLens.', singular: 'MDA',
    empty: 'Create an MDA before adding services.',
    summary: (item) => item.entityType || item.jurisdiction || 'Entity details not set',
    meta: (item) => `${item.coverageStatus === 'pilot' ? 'published' : item.coverageStatus?.replaceAll('_', ' ') || 'published'} · ${item.isActive ? 'Active' : 'Inactive'}`,
  },
  services: {
    title: 'Services', description: 'Maintain service information, requirements and procedures.', singular: 'service',
    empty: 'Create an MDA first, then add its services.',
    summary: (item) => item.mdaName || 'MDA not available',
    meta: (item) => `${item.category || 'Uncategorised'} · ${item.isActive ? 'Active' : 'Inactive'}`,
  },
  fees: {
    title: 'Fee options', description: 'Manage current and historical pricing options without losing evidence history.', singular: 'fee',
    empty: 'Create a service before adding a fee option.',
    summary: (item) => `${item.serviceName || 'Service'} · ${item.mdaName || 'MDA'}`,
    meta: (item) => `${item.pricingModel?.replaceAll('_', ' ')} · ${item.verificationStatus?.replaceAll('_', ' ')}`,
  },
  sources: {
    title: 'Authoritative sources', description: 'Create evidence records once, then link them to relevant fees.', singular: 'source',
    empty: 'Add the first authoritative evidence source.',
    summary: (item) => item.publisher || item.documentReference || 'Publisher not set',
    meta: (item) => `${item.sourceType?.replaceAll('_', ' ')} · Tier ${item.evidenceTier}`,
  },
};

export function AdminEntityListPage({ type }) {
  const config = configs[type];
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    adminApi[type].list({ page, pageSize: 25, search: submittedSearch })
      .then((data) => active && setState({ loading: false, data, error: '' }))
      .catch((error) => active && setState({ loading: false, data: null, error: error.message }));
    return () => { active = false; };
  }, [type, page, submittedSearch]);

  function submit(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  const items = state.data?.items || [];
  return (
    <div>
      <AdminPageHeader title={config.title} description={config.description} action={{ to: `/admin/${type}/new`, label: `Add ${config.singular}` }} />
      <form onSubmit={submit} className="admin-panel mb-4 flex gap-2 p-3" role="search">
        <label htmlFor={`${type}-search`} className="sr-only">Search {config.title}</label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id={`${type}-search`} value={search} onChange={(event) => setSearch(event.target.value)} className="admin-input pl-10" placeholder={`Search ${config.title.toLowerCase()}…`} />
        </div>
        <button type="submit" className="secondary-button">Search</button>
      </form>
      {state.loading && <AdminLoading />}
      {state.error && <AdminError message={state.error} />}
      {!state.loading && !state.error && !items.length && <AdminEmpty title={`No ${config.title.toLowerCase()} found`} message={config.empty} action={{ to: `/admin/${type}/new`, label: `Add ${config.singular}` }} />}
      {!!items.length && (
        <>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{state.data.pagination?.total ?? items.length} records</span><span>Page {page}</span>
          </div>
          <div className="admin-panel divide-y divide-slate-200">
            {items.map((item) => (
              <article key={item.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <Link to={`/admin/${type}/${item.id}`} className="break-words text-sm font-extrabold text-navy hover:text-leaf">{item.name || item.label || item.title || `${config.singular} #${item.id}`}</Link>
                  <p className="mt-1 truncate text-xs text-slate-600">{config.summary(item)}</p>
                  <p className="mt-1 text-xs font-semibold capitalize text-slate-500">{config.meta(item)} · Updated {formatDate(item.updatedAt || item.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/admin/${type}/${item.id}`} className="secondary-button">View</Link>
                  <Link to={`/admin/${type}/${item.id}/edit`} className="secondary-button">Edit</Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
            <button type="button" className="secondary-button" disabled={page >= (state.data.pagination?.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </>
      )}
    </div>
  );
}
