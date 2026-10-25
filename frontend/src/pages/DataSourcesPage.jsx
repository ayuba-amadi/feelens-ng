import { useMemo, useState } from 'react';
import { ExternalLink as ExternalLinkIcon, FileText, Filter, Search } from 'lucide-react';
import sourceRegister from '../data/source-register.json';
import { useApiResource } from '../hooks/use-api';
import { publicApi } from '../lib/api';
import { formatDate, valueOf } from '../lib/format';
import { ExternalLink } from '../components/common/ExternalLink';
import { ErrorState, LoadingState } from '../components/common/States';
import { PageIntro } from '../components/common/PageIntro';

const tiers = [
  { label: 'Tier 1', title: 'Primary legal or approved fee evidence', items: ['Acts', 'Regulations', 'Gazettes', 'Statutory instruments', 'Approved fee schedules', 'Official circulars'] },
  { label: 'Tier 2', title: 'Official institutional publication', items: ['MDA websites', 'Service portals', 'Notices', 'FAQs', 'Fee pages', 'Process pages and SLAs'] },
  { label: 'Tier 3', title: 'Formal institutional confirmation', items: ['Written MDA correspondence', 'Official email or letter', 'FOI responses where appropriate'] }
];

function registerIndex() {
  const bySource = new Map();
  for (const record of sourceRegister.records || []) {
    const current = bySource.get(record.source_id) || { mdaNames: new Set(), services: new Set(), statuses: new Set() };
    if (record.mda) current.mdaNames.add(record.mda);
    if (record.service) current.services.add(record.service);
    if (record.verification_status) current.statuses.add(record.verification_status);
    bySource.set(record.source_id, current);
  }
  return bySource;
}

function uniqueSourceRows(liveSources) {
  const associations = registerIndex();
  const fromRegister = new Map();
  for (const record of sourceRegister.records || []) {
    if (!fromRegister.has(record.source_id)) fromRegister.set(record.source_id, record);
  }
  const rows = (liveSources.length ? liveSources : [...fromRegister.values()]).map((source) => {
    const sourceId = valueOf(source, 'id') !== undefined ? `source-${valueOf(source, 'id')}` : source.source_id;
    const related = associations.get(sourceId);
    return {
      ...fromRegister.get(sourceId),
      ...source,
      sourceId,
      mdaNames: [...(related?.mdaNames || [])].sort(),
      services: [...(related?.services || [])].sort(),
      statuses: [...(related?.statuses || [])].sort(),
      linkedServiceCount: related?.services.size || 0,
    };
  });
  return rows.sort((a, b) => String(a.title || a.source_title).localeCompare(String(b.title || b.source_title)));
}

function SourceCard({ source }) {
  const title = valueOf(source, 'title', 'source_title') || 'Untitled source';
  const url = valueOf(source, 'url', 'source_url');
  const publicationDate = valueOf(source, 'publicationDate', 'publication_date');
  const effectiveDate = valueOf(source, 'effectiveDate', 'effective_date');
  const lastChecked = valueOf(source, 'accessedAt', 'last_checked', 'retrievedDate');
  const mdaLabel = source.mdaNames.length ? source.mdaNames.join(', ') : 'MDA association not supplied';
  return <article className="surface-card flex h-full flex-col p-4 sm:p-5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileText size={18} aria-hidden="true" /></div><div className="min-w-0"><h3 className="break-words font-semibold text-ink">{title}</h3><p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{valueOf(source, 'sourceType', 'source_type') || 'Source type not supplied'} · Tier {valueOf(source, 'evidenceTier', 'evidence_tier') || '—'}</p></div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">MDA</dt><dd className="mt-1 text-slate-700">{mdaLabel}</dd></div><div><dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Linked services</dt><dd className="mt-1 text-slate-700">{source.linkedServiceCount || '—'}</dd></div><div><dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Publisher</dt><dd className="mt-1 text-slate-700">{valueOf(source, 'publisher') || 'Not supplied'}</dd></div><div><dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Last checked</dt><dd className="mt-1 text-slate-700">{formatDate(lastChecked)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Publication date</dt><dd className="mt-1 text-slate-700">{publicationDate ? formatDate(publicationDate) : 'Not supplied'}</dd></div><div><dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Effective date</dt><dd className="mt-1 text-slate-700">{effectiveDate ? formatDate(effectiveDate) : 'Not supplied'}</dd></div></dl>{source.services.length ? <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">Services: {source.services.slice(0, 3).join('; ')}{source.services.length > 3 ? `; +${source.services.length - 3} more` : ''}</p> : null}<div className="mt-auto pt-4">{url ? <ExternalLink href={url} className="text-sm"><ExternalLinkIcon size={14} aria-hidden="true" />View official source</ExternalLink> : null}</div></article>;
}

export function DataSourcesPage() {
  const [query, setQuery] = useState('');
  const [mda, setMda] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const state = useApiResource((options) => publicApi.getSources({ pageSize: 100 }, options), []);
  const liveSources = state.status === 'success' ? state.data?.items || [] : [];
  const sources = useMemo(() => uniqueSourceRows(liveSources), [liveSources]);
  const options = useMemo(() => ({
    mdas: [...new Set(sources.flatMap((source) => source.mdaNames))].sort(),
    sourceTypes: [...new Set(sources.map((source) => valueOf(source, 'sourceType', 'source_type')).filter(Boolean))].sort(),
    tiers: [...new Set(sources.map((source) => String(valueOf(source, 'evidenceTier', 'evidence_tier') || '')).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
  }), [sources]);
  const filteredSources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sources.filter((source) => {
      const searchable = [source.title, source.source_title, source.publisher, source.url, source.source_url, ...source.mdaNames, ...source.services].filter(Boolean).join(' ').toLowerCase();
      return (!needle || searchable.includes(needle))
        && (!mda || source.mdaNames.includes(mda))
        && (!sourceType || valueOf(source, 'sourceType', 'source_type') === sourceType)
        && (!tier || String(valueOf(source, 'evidenceTier', 'evidence_tier')) === tier)
        && (!status || source.statuses.includes(status));
    });
  }, [mda, query, sources, sourceType, status, tier]);
  const reset = () => { setQuery(''); setMda(''); setSourceType(''); setTier(''); setStatus(''); };

  return <div className="page-shell space-y-10 py-8 sm:py-10"><PageIntro eyebrow="Data sources" title="A public register of fee evidence" description="FeeLens links each public fee record to the official source used for review. Dates are shown only when the source record supplies them." /><section className="grid gap-4 lg:grid-cols-3">{tiers.map((item) => <article key={item.label} className="surface-card p-5"><p className="eyebrow">{item.label}</p><h2 className="mt-2 font-semibold text-ink">{item.title}</h2><ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">{item.items.map((value) => <li key={value} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden="true" />{value}</li>)}</ul></article>)}</section><section aria-labelledby="source-register-heading"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Current register</p><h2 id="source-register-heading" className="section-heading mt-2">Official sources in FeeLens</h2></div><p className="text-sm text-slate-500">{sourceRegister.source_count} sources · {sourceRegister.evidence_link_count} evidence links</p></div><div className="surface-card mt-5 p-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5"><label className="relative block lg:col-span-2"><span className="sr-only">Search sources</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-ink" placeholder="Search source, MDA or service" /></label><label className="block text-xs font-medium text-slate-600">MDA<select value={mda} onChange={(event) => setMda(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink"><option value="">All MDAs</option>{options.mdas.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="block text-xs font-medium text-slate-600">Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink"><option value="">All types</option>{options.sourceTypes.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label className="block text-xs font-medium text-slate-600">Evidence tier<select value={tier} onChange={(event) => setTier(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink"><option value="">All tiers</option>{options.tiers.map((value) => <option key={value} value={value}>Tier {value}</option>)}</select></label></div><div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-xs font-medium text-slate-600">Verification relevance<select value={status} onChange={(event) => setStatus(event.target.value)} className="ml-2 min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink"><option value="">All linked statuses</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="conflicting">Conflicting</option><option value="unable_to_verify">Unable to verify</option></select></label><button type="button" onClick={reset} className="text-button"><Filter size={15} aria-hidden="true" />Clear filters</button></div></div>{state.status === 'loading' && !sources.length ? <div className="mt-5"><LoadingState label="Loading the public source register…" /></div> : state.status === 'error' && !sources.length ? <div className="mt-5"><ErrorState title="The source register is unavailable" description="The public API could not return source records, and no current register snapshot is available." /></div> : <><p className="mt-4 text-sm text-slate-500">Showing {filteredSources.length} of {sources.length} source records.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{filteredSources.map((source) => <SourceCard key={source.sourceId} source={source} />)}</div></>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-ink">What is not enough on its own?</h2><p className="mt-2 text-sm leading-6 text-slate-600">FeeLens does not use blogs, unofficial agents, or third-party websites as sole authoritative evidence. They may identify a research lead, but they do not establish an official fee by themselves.</p></section></div>;
}
