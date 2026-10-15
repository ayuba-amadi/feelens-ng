import { useParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, ListChecks, ShieldCheck } from 'lucide-react';
import { publicApi } from '../lib/api';
import { useApiResource } from '../hooks/use-api';
import { asArray, formatDate, valueOf } from '../lib/format';
import { ExternalLink } from '../components/common/ExternalLink';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { FeeOptionCard } from '../components/service/FeeOptionCard';
import { EvidenceCard } from '../components/service/EvidenceCard';
import { OfficialChannelCard } from '../components/service/OfficialChannelCard';
import { VerificationExplanation } from '../components/service/VerificationExplanation';

export function ServiceDetailPage() {
  const { slug } = useParams();
  const state = useApiResource((options) => publicApi.getServiceBySlug(slug, options), [slug]);
  if (state.status === 'loading') return <div className="page-shell py-8"><LoadingState label="Loading service details…" /></div>;
  if (state.status === 'error') return <div className="page-shell py-8"><ErrorState title={state.error?.code === 'not_found' ? 'Service not found' : 'Service details are not available'} description={state.error?.code === 'not_found' ? 'This public service record does not exist in FeeLens.' : 'The public API did not return this service record.'} /></div>;

  const service = state.data || {};
  const status = valueOf(service, 'verificationStatus', 'verification_status', 'status');
  const feeOptions = asArray(valueOf(service, 'feeOptions', 'fee_options', 'fees'));
  const requirements = asArray(valueOf(service, 'requirements', 'requirementsList'));
  const procedure = asArray(valueOf(service, 'procedure', 'steps', 'process'));
  const channels = asArray(valueOf(service, 'officialChannels', 'official_channels', 'channels'));
  const sources = asArray(valueOf(service, 'sources', 'evidence', 'feeSources', 'fee_sources'));
  const mdaValue = valueOf(service, 'mdaName', 'mda_name', 'mda');
  const mdaName = typeof mdaValue === 'object' ? valueOf(mdaValue, 'name', 'fullName') : mdaValue;
  const officialUrl = valueOf(service, 'officialUrl', 'official_url');
  return <div className="page-shell space-y-8 py-8 sm:py-10"><section className="surface-card p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="eyebrow">Public service</p><h1 className="mt-2 break-words text-3xl font-black tracking-tight text-ink sm:text-4xl">{valueOf(service, 'name', 'title') || 'Unnamed service'}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{valueOf(service, 'description', 'summary') || 'A public description has not been supplied yet.'}</p><div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge status={status} /><span className="text-sm text-slate-500">{mdaName || 'MDA not listed'}</span>{valueOf(service, 'jurisdiction') ? <><ChevronRight size={14} className="text-slate-400" aria-hidden="true" /><span className="text-sm text-slate-500">{valueOf(service, 'jurisdiction')}</span></> : null}</div></div>{officialUrl ? <ExternalLink href={officialUrl}>Official service</ExternalLink> : null}</div><div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" />Last checked {formatDate(valueOf(service, 'lastChecked', 'last_checked', 'checkedAt'))}</span>{valueOf(service, 'category') ? <span>{valueOf(service, 'category')}</span> : null}</div></section>

    <section><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Primary fee answer</p><h2 className="section-heading mt-2">Fee options</h2></div><p className="text-sm text-slate-500">Each option is shown separately.</p></div><div className="mt-5 grid gap-4 lg:grid-cols-2">{feeOptions.length ? feeOptions.map((option, index) => <FeeOptionCard key={valueOf(option, 'id') || index} option={option} index={index} />) : <EmptyState title="Fee information not available yet" description="No fee option has been supplied for this service. That is not the same as free." />}</div></section>

    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"><section><p className="eyebrow">Before you start</p><h2 className="section-heading mt-2">Requirements</h2><div className="mt-5">{requirements.length ? <ul className="surface-card divide-y divide-slate-100 p-1">{requirements.map((requirement, index) => <li key={index} className="flex gap-3 p-4 text-sm leading-6 text-slate-700"><ShieldCheck size={17} className="mt-1 shrink-0 text-leaf" aria-hidden="true" />{typeof requirement === 'string' ? requirement : valueOf(requirement, 'name', 'description', 'label') || 'Requirement not described'}</li>)}</ul> : <EmptyState title="Requirements not listed yet" description="Requirements will be shown here when they are supplied by the public record." />}</div></section><section><p className="eyebrow">Process</p><h2 className="section-heading mt-2">How the service works</h2><div className="mt-5">{procedure.length ? <ol className="space-y-3">{procedure.map((step, index) => <li key={index} className="surface-card flex gap-3 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-black text-white">{index + 1}</span><span className="text-sm leading-6 text-slate-700">{typeof step === 'string' ? step : valueOf(step, 'title', 'description', 'name') || 'Procedure step not described'}</span></li>)}</ol> : <EmptyState title="Procedure not listed yet" description="The process will be shown here when it is supplied by the public record." icon={ListChecks} />}</div></section></div>

    <section><p className="eyebrow">Continue officially</p><h2 className="section-heading mt-2">Official service channel</h2><div className="mt-5">{channels.length ? <div className="grid gap-4 sm:grid-cols-2">{channels.map((channel, index) => <OfficialChannelCard key={valueOf(channel, 'id', 'url') || index} channel={channel} />)}</div> : <EmptyState title="Official channel not listed yet" description="FeeLens does not invent government links. Follow a verified official channel when one is supplied." />}</div></section>

    <section><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Evidence</p><h2 className="section-heading mt-2">Sources behind this record</h2></div><p className="text-sm text-slate-500">{sources.length ? `${sources.length} source${sources.length === 1 ? '' : 's'}` : 'No sources listed'}</p></div><div className="mt-5">{sources.length ? <div className="grid gap-4 lg:grid-cols-2">{sources.map((source, index) => <EvidenceCard key={valueOf(source, 'id', 'url') || index} source={source} />)}</div> : <EmptyState title="Evidence is not available yet" description="This record needs an authoritative source before FeeLens can present a confirmed fee." />}</div></section>

    <div className="grid gap-4 lg:grid-cols-2"><VerificationExplanation status={status} /><div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-ink">Last review</h3><p className="mt-2 text-sm text-slate-600">Checked {formatDate(valueOf(service, 'lastChecked', 'last_checked', 'checkedAt'))}</p><p className="mt-1 text-sm text-slate-600">Next review: {formatDate(valueOf(service, 'nextReviewDate', 'next_review_date'))}</p></div></div><p className="text-xs leading-5 text-slate-500">FeeLens is independent civic technology. It does not collect government payments or replace official government portals. Review the linked official channel before completing a transaction.</p></div>;
}

