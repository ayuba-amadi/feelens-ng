import { useEffect } from 'react';
import { ArrowRight, Building2, FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicApi } from '../lib/api';
import { formatCount, valueOf } from '../lib/format';
import { useApiResource } from '../hooks/use-api';
import { SearchBox } from '../components/common/SearchBox';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { MetricCard } from '../components/common/MetricCard';
import { SectionHeading } from '../components/common/SectionHeading';
import { MdaCard } from '../components/mda/MdaCard';
import { EvidenceFlow } from '../components/home/EvidenceFlow';
import { HowItWorks } from '../components/home/HowItWorks';

function metricValue(stats, keys, hasCoverage) {
  const value = valueOf(stats, ...keys);
  return !hasCoverage || value === undefined || value === null ? 'No published data yet' : formatCount(value);
}

export function HomePage() {
  const stats = useApiResource((options) => publicApi.getPublicStats(options), []);
  const featured = useApiResource((options) => publicApi.getMdas({ featured: true, limit: 4 }, options), []);

  useEffect(() => {
    if (window.location.hash === '#public-search') document.getElementById('public-search')?.focus();
  }, []);

  const statData = stats.status === 'success' && stats.data && typeof stats.data === 'object' ? stats.data : null;
  const hasCoverage = statData && ['mdasCovered', 'servicesMapped', 'verifiedFeeItems', 'sources']
    .some((key) => Number(statData[key]) > 0);
  const featuredItems = featured.status === 'success' ? featured.data?.items || [] : [];
  return <div>
    <section className="hero-grid hero-glow border-b border-slate-200/70"><div className="page-shell py-8 sm:py-10"><div className="mx-auto max-w-4xl text-center"><p className="eyebrow">Public service fee transparency</p><h1 className="mt-3 text-[2.125rem] leading-[1.12] font-black tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">Know the official fee before you pay.</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Find public services, review fee information and evidence, and continue through official channels.</p></div><div className="surface-card mx-auto mt-5 max-w-3xl p-3 sm:mt-6 sm:p-4"><SearchBox id="public-search" compact /></div></div></section>

    <div className="page-shell space-y-8 py-6 sm:py-8">
      <section><SectionHeading eyebrow="Coverage overview" title="What FeeLens currently maps" description="Based on published FeeLens records." /><div className="mt-5 grid grid-cols-2 gap-3"><MetricCard label="MDAs covered" value={metricValue(statData, ['mdasCovered', 'mdas_covered', 'mdaCount'], hasCoverage)} /><MetricCard label="Services mapped" value={metricValue(statData, ['servicesMapped', 'services_mapped', 'serviceCount'], hasCoverage)} /></div>{stats.status === 'error' ? <p className="mt-3 text-xs text-slate-500">Published data is not available yet; this view will update as verified records are published.</p> : null}</section>

      <section><SectionHeading eyebrow="Featured coverage" title="Browse the public catalogue" description="Explore published MDAs and public services supported by available evidence." action={<Link className="text-button" to="/mdas">View all MDAs <ArrowRight size={16} aria-hidden="true" /></Link>} />{featured.status === 'loading' ? <div className="mt-6"><LoadingState label="Loading featured coverage…" /></div> : featured.status === 'error' ? <div className="mt-6"><ErrorState title="The public catalogue is temporarily unavailable" description="FeeLens could not load published catalogue records. Please try again shortly." /></div> : featuredItems.length === 0 ? <div className="mt-6"><EmptyState title="No published MDAs yet" description="Published MDA records will appear here as they become available." icon={Building2} /></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featuredItems.map((mda, index) => <MdaCard key={valueOf(mda, 'id', 'slug') || index} mda={mda} />)}</div>}</section>

      <HowItWorks />
      <EvidenceFlow />

      <section className="overflow-hidden rounded-2xl bg-ink p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Start with a service</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find the official channel</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">Browse published records or read how FeeLens reviews them.</p></div><div className="mt-5 flex shrink-0 flex-wrap gap-3 sm:mt-0"><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-emerald-50" to="/mdas">Browse MDAs <ArrowRight size={16} aria-hidden="true" /></Link><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10" to="/methodology"><FileCheck2 size={16} aria-hidden="true" /> Methodology</Link></div></section>
    </div>
  </div>;
}

