import { useParams } from 'react-router-dom';
import { Layers3 } from 'lucide-react';
import { publicApi } from '../lib/api';
import { useApiResource } from '../hooks/use-api';
import { asArray, formatCount, valueOf } from '../lib/format';
import { ExternalLink } from '../components/common/ExternalLink';
import { MetricCard } from '../components/common/MetricCard';
import { MdaLogo } from '../components/common/MdaLogo';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { ServiceCard } from '../components/mda/ServiceCard';
import { OfficialChannelCard } from '../components/service/OfficialChannelCard';

function coverageCount(services, statuses) {
  if (!services.length) return '—';
  return formatCount(services.filter((service) => statuses.includes(String(valueOf(service, 'verificationStatus', 'verification_status', 'status') || '').toLowerCase())).length);
}

export function MdaDetailPage() {
  const { slug } = useParams();
  const mdaState = useApiResource((options) => publicApi.getMdaBySlug(slug, options), [slug]);
  const servicesState = useApiResource((options) => publicApi.getServicesForMda(slug, { pageSize: 100 }, options), [slug]);
  const mda = mdaState.status === 'success' ? mdaState.data : null;
  const servicesData = servicesState.status === 'success' ? servicesState.data : null;
  const services = asArray(servicesData?.items);
  const website = valueOf(mda, 'websiteUrl', 'website_url', 'officialWebsite');
  const mappedServices = valueOf(mda, 'mappedActiveServices', 'serviceCount', 'service_count', 'mappedServices') ?? (servicesState.status === 'success' && services.length ? services.length : undefined);
  const verified = valueOf(mda, 'verifiedFeeItems', 'verified_fee_items');
  const pending = valueOf(mda, 'pendingItems') ?? coverageCount(services, ['pending']);
  const unresolved = valueOf(mda, 'conflictingItems') !== undefined || valueOf(mda, 'unableToVerifyItems') !== undefined
    ? Number(valueOf(mda, 'conflictingItems') || 0) + Number(valueOf(mda, 'unableToVerifyItems') || 0)
    : (services.length ? formatCount(services.filter((service) => ['conflicting', 'unable_to_verify'].includes(String(valueOf(service, 'verificationStatus', 'verification_status', 'status') || '').toLowerCase())).length) : '—');

  if (mdaState.status === 'loading') return <div className="page-shell py-8"><LoadingState label="Loading MDA profile…" /></div>;
  if (mdaState.status === 'error') return <div className="page-shell py-8"><ErrorState title={mdaState.error?.code === 'not_found' ? 'MDA not found' : 'MDA profile is not available'} description={mdaState.error?.code === 'not_found' ? 'This public MDA record does not exist in FeeLens.' : 'FeeLens could not load this MDA profile. Please try again shortly.'} /></div>;

  const officialChannels = valueOf(mda, 'officialChannels', 'official_channels') || [];
  const name = valueOf(mda, 'name', 'fullName') || 'Unnamed MDA';
  const acronym = valueOf(mda, 'acronym', 'shortName');
  return <div className="page-shell space-y-6 py-6 sm:py-8"><section className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex min-w-0 items-start gap-4"><MdaLogo name={name} acronym={acronym} slug={slug} size="large" /><div className="min-w-0"><p className="eyebrow">MDA profile</p><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{name}</h1>{acronym ? <p className="mt-2 text-sm font-medium uppercase tracking-[0.1em] text-slate-500">{acronym}</p> : null}</div></div>{website ? <ExternalLink href={website} label={`Visit the official ${name} website (opens in a new tab)`}>Official website</ExternalLink> : null}</div></section><section aria-labelledby="fee-coverage-title"><p id="fee-coverage-title" className="eyebrow">Fee coverage</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard label="Mapped services" value={mappedServices === undefined ? '—' : formatCount(mappedServices)} /><MetricCard label="Verified fees" value={verified === undefined ? '—' : formatCount(verified)} /><MetricCard label="Pending" value={typeof pending === 'number' ? formatCount(pending) : pending} /><MetricCard label="Conflicting / unresolved" value={typeof unresolved === 'number' ? formatCount(unresolved) : unresolved} /></div></section><section><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Service list</p><h2 className="section-heading mt-2">Services linked to this MDA</h2></div>{services.length ? <span className="text-sm text-slate-500">{formatCount(services.length)} listed</span> : null}</div><div className="mt-5">{servicesState.status === 'loading' ? <LoadingState label="Loading services…" /> : servicesState.status === 'error' ? <ErrorState title="Services are not available yet" description="This MDA profile loaded, but its public service list could not be reached." /> : services.length === 0 ? <EmptyState title="No services mapped yet" description="Services will appear here when they have been reviewed and added to the public catalogue." icon={Layers3} /> : <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map((service, index) => <ServiceCard key={valueOf(service, 'id', 'slug') || index} service={service} />)}</div>}</div></section>{officialChannels.length ? <section><p className="eyebrow">Official MDA channel</p><h2 className="section-heading mt-2">Start from the official institution channel</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{officialChannels.map((channel, index) => <OfficialChannelCard key={valueOf(channel, 'id', 'url') || index} channel={channel} />)}</div></section> : null}</div>;
}

