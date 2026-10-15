import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';
import { formatDateTime } from '../../lib/format';

export function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: true, items: [], error: '' });
  useEffect(() => {
    let active = true;
    setState((value) => ({ ...value, loading: true }));
    adminApi.auditLogs({ pageSize: 50, search: query }).then((data) => active && setState({ loading: false, items: data.items || [], error: '' }))
      .catch((error) => active && setState({ loading: false, items: [], error: error.message }));
    return () => { active = false; };
  }, [query]);
  return (
    <div>
      <AdminPageHeader title="Audit history" description="Read-only history of important management changes. Passwords, hashes, sessions and secrets are excluded from audit JSON." />
      <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }} className="admin-panel mb-4 flex gap-2 p-3" role="search"><label htmlFor="audit-search" className="sr-only">Search audit history</label><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="audit-search" value={search} onChange={(e) => setSearch(e.target.value)} className="admin-input pl-10" placeholder="Search action or entity type…" /></div><button className="secondary-button">Search</button></form>
      {state.loading ? <AdminLoading /> : state.error ? <AdminError message={state.error} /> : state.items.length === 0 ? <AdminEmpty title="No audit records" message="Audit history appears after management changes are made." /> : <div className="admin-panel divide-y divide-slate-200">{state.items.map((item) => <article key={item.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-extrabold text-navy">{item.action}</p><p className="text-xs text-slate-500">{item.entityType} #{item.entityId || '—'} · {item.actorName || item.actorEmail || 'System / legacy actor'}</p></div><time className="text-xs font-semibold text-slate-500">{formatDateTime(item.createdAt)}</time></div><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-leaf">View old/new values</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify({ old: item.oldValues, new: item.newValues }, null, 2)}</pre></details></article>)}</div>}
    </div>
  );
}
