import { useEffect, useState } from 'react';
import { useApiResource } from '../hooks/use-api';
import { publicApi } from '../lib/api';
import { valueOf } from '../lib/format';
import { EvidenceCard } from '../components/service/EvidenceCard';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { PageIntro } from '../components/common/PageIntro';

const tiers = [
  { label: 'Tier 1', title: 'Primary legal or approved fee evidence', items: ['Acts', 'Regulations', 'Gazettes', 'Statutory instruments', 'Approved official fee schedules', 'Official circulars'] },
  { label: 'Tier 2', title: 'Official publication', items: ['Official MDA websites', 'Official service portals', 'Officially published notices and documents'] },
  { label: 'Tier 3', title: 'Formal confirmation', items: ['Formal MDA correspondence', 'Official email or letter', 'FOI responses where appropriate'] }
];

export function DataSourcesPage() {
  const [page, setPage] = useState(1);
  const [sources, setSources] = useState([]);
  const [retry, setRetry] = useState(0);
  const state = useApiResource((options) => publicApi.getSources({ page, pageSize: 24 }, options), [page, retry]);

  useEffect(() => {
    if (state.status !== 'success') return;
    setSources((current) => page === 1 ? state.data?.items || [] : [...current, ...(state.data?.items || [])]);
  }, [state.status, state.data, page]);

  const initialLoading = state.status === 'loading' && sources.length === 0;
  const hasMore = state.data?.hasMore === true;
  function retrySources() {
    setSources([]);
    setPage(1);
    setRetry((current) => current + 1);
  }
  return <div className="page-shell space-y-10 py-8 sm:py-10"><PageIntro eyebrow="Data sources" title="Where fee evidence comes from" description="A source is useful only when its authority, scope, and date are clear. The public catalogue will list real sources returned by the API." /><section className="grid gap-4 lg:grid-cols-3">{tiers.map((tier) => <article key={tier.label} className="surface-card p-5"><p className="eyebrow">{tier.label}</p><h2 className="mt-2 font-bold text-ink">{tier.title}</h2><ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">{tier.items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden="true" />{item}</li>)}</ul></article>)}</section><section><p className="eyebrow">Public source register</p><h2 className="section-heading mt-2">Sources currently available</h2><div className="mt-5">{initialLoading ? <LoadingState label="Loading source register…" /> : state.status === 'error' && sources.length === 0 ? <ErrorState title="The source register is not available yet" description="The public API did not return source records." onRetry={retrySources} /> : sources.length === 0 ? <EmptyState title="No public sources listed yet" description="When source records are available, this register will show their type, publisher, dates, and official reference." /> : <><div className="grid gap-4 lg:grid-cols-2">{sources.map((source, index) => <EvidenceCard key={valueOf(source, 'id', 'url') || index} source={source} />)}</div>{state.status === 'error' ? <div className="mt-5"><ErrorState title="More sources are not available right now" description="The public source register could not load the next page." onRetry={retrySources} /></div> : hasMore ? <div className="mt-6 flex justify-center"><button type="button" className="secondary-button" disabled={state.status === 'loading'} onClick={() => setPage((current) => current + 1)}>{state.status === 'loading' ? 'Loading more…' : 'Load more sources'}</button></div> : null}</>}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-ink">What is not enough by itself?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Agents, blogs, third-party fee websites, and unverified social media may identify a research lead, but they are not sufficient on their own to establish an official fee.</p></section></div>;
}

