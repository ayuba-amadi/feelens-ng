import { useParams } from 'react-router-dom';
import { Globe2, Layers3, MapPin, ShieldCheck } from 'lucide-react';
import { publicApi } from '../lib/api';
import { useApiResource } from '../hooks/use-api';
import { asArray, formatCount, valueOf } from '../lib/format';
import { ExternalLink } from '../components/common/ExternalLink';
import { MetricCard } from '../components/common/MetricCard';
import { Monogram } from '../components/common/Monogram';
import { PageIntro } from '../components/common/PageIntro';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { ServiceCard } from '../components/mda/ServiceCard';

function coverageCount(services, statuses) {
  if (!services.length) return '—';
  return formatCount(services.filter((service) => statuses.includes(String(valueOf(service, 'verificationStatus', 'verification_status', 'status') || '').toLowerCase())).length);
}

export function MdaDetailPage() {
  const { slug } = useParams();
  const mdaState = useApiResource((options) => publicApi.getMdaBySlug(slug, options), [slug]);
  const servicesState = useApiResource((options) => publicApi.getServicesForMda(slug, options), [slug]);
  const mda = mdaState.status === 'success' ? mdaState.data : null;
  const services = servicesState.status === 'success' ? asArray(servicesState.data) : [];
  const website = valueOf(mda, 'websiteUrl', 'website_url', 'officialWebsite');
  const mappedServices = valueOf(mda, 'serviceCount', 'service_count', 'mappedServices') ?? (servicesState.status === 'success' && services.length ? services.length : undefined);
  const verified = valueOf(mda, 'verifiedFeeItems', 'verified_fee_items');

  if (mdaState.status === 'loading') return <div className="page-shell py-8"><LoadingState label="Loading MDA profile…" /></div>;
  if (mdaState.status === 'error') return <div className="page-shell py-8"><ErrorState title={mdaState.error?.code === 'not_found' ? 'MDA not found' : 'MDA profile is not available'} description={mdaState.error?.code === 'not_found' ? 'This public MDA record does not exist in FeeLens.' : 'The public API did not return this MDA profile.'} /></div>;

  return <div className="page-shell space-y-8 py-8 sm:py-10"><section className="surface-card p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-4"><Monogram name={valueOf(mda, 'name', 'fullName')} acronym={valueOf(mda, 'acronym', 'shortName')} size="large" /><div className="min-w-0"><p className="eyebrow">MDA profile</p><h1 className="mt-2 break-words text-2xl font-black tracking-tight text-ink sm:text-3xl">{valueOf(mda, 'name', 'fullName') || 'Unnamed MDA'}</h1><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={valueOf(mda, 'coverageStatus', 'coverage_status', 'status')} /><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"><MapPin size={13} aria-hidden="true" />{valueOf(mda, 'jurisdiction') || 'Jurisdiction not listed'}</span></div></div></div>{website ? <ExternalLink href={website}>Official website</ExternalLink> : null}</div><div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3"><p className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck size={16} className="text-leaf" aria-hidden="true" />{valueOf(mda, 'entityType', 'entity_type') || 'Entity type not listed'}</p><p className="flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} className="text-leaf" aria-hidden="true" />{valueOf(mda, 'jurisdiction') || 'Jurisdiction not listed'}</p><p className="flex items-center gap-2 text-sm text-slate-600"><Globe2 size={16} className="text-leaf" aria-hidden="true" />Independent public record</p></div></section><section><PageIntro eyebrow="Coverage summary" title="What is mapped here" description="Counts reflect records returned by the public API. A dash means the API has not supplied that measure." /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard label="Mapped services" value={mappedServices === undefined ? '—' : formatCount(mappedServices)} /><MetricCard label="Verified fee items" value={verified === undefined ? '—' : formatCount(verified)} /><MetricCard label="Pending" value={coverageCount(services, ['pending'])} /><MetricCard label="Conflicting / unresolved" value={services.length ? formatCount(services.filter((service) => ['conflicting', 'unable_to_verify'].includes(String(valueOf(service, 'verificationStatus', 'verification_status', 'status') || '').toLowerCase())).length) : '—'} /></div></section><section><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Service list</p><h2 className="section-heading mt-2">Services linked to this MDA</h2></div>{services.length ? <span className="text-sm text-slate-500">{formatCount(services.length)} listed</span> : null}</div><div className="mt-5">{servicesState.status === 'loading' ? <LoadingState label="Loading services…" /> : servicesState.status === 'error' ? <ErrorState title="Services are not available yet" description="This MDA profile loaded, but its public service list could not be reached." /> : services.length === 0 ? <EmptyState title="No services mapped yet" description="Services will appear here when they have been reviewed and added to the public catalogue." icon={Layers3} /> : <div className="grid gap-4 lg:grid-cols-2">{services.map((service, index) => <ServiceCard key={valueOf(service, 'id', 'slug') || index} service={service} />)}</div>}</div></section></div>;
}

