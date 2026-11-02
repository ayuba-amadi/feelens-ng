import { useState } from 'react';
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const website = valueOf(mda, 'websiteUrl', 'website_url', 'officialWebsite');
  const mappedServices = valueOf(mda, 'mappedActiveServices', 'serviceCount', 'service_count', 'mappedServices') ?? (servicesState.status === 'success' && services.length ? services.length : undefined);
  const verified = valueOf(mda, 'currentVerifiedFeeItems', 'verifiedFeeItems', 'verified_fee_items');
  const pending = valueOf(mda, 'pendingItems') ?? coverageCount(services, ['pending']);
  const sourceSupported = valueOf(mda, 'sourceSupportedItems');
  const unresolved = valueOf(mda, 'conflictingItems') !== undefined || valueOf(mda, 'unableToVerifyItems') !== undefined
    ? Number(valueOf(mda, 'conflictingItems') || 0) + Number(valueOf(mda, 'unableToVerifyItems') || 0)
    : (services.length ? formatCount(services.filter((service) => ['conflicting', 'unable_to_verify'].includes(String(valueOf(service, 'verificationStatus', 'verification_status', 'status') || '').toLowerCase())).length) : '—');
  const categories = [...new Set(services.map((service) => valueOf(service, 'category')).filter(Boolean))];
  const filteredServices = selectedCategory === 'all' ? services : services.filter((service) => valueOf(service, 'category') === selectedCategory);

  if (mdaState.status === 'loading') return <div className="page-shell py-8"><LoadingState label="Loading MDA profile…" /></div>;
  if (mdaState.status === 'error') return <div className="page-shell py-8"><ErrorState title={mdaState.error?.code === 'not_found' ? 'MDA not found' : 'MDA profile is not available'} description={mdaState.error?.code === 'not_found' ? 'This public MDA record does not exist in FeeLens.' : 'FeeLens could not load this MDA profile. Please try again shortly.'} /></div>;

  const officialChannels = valueOf(mda, 'officialChannels', 'official_channels') || [];
  const name = valueOf(mda, 'name', 'fullName') || 'Unnamed MDA';
  const acronym = valueOf(mda, 'acronym', 'shortName');
  const isSingleCategoryGroup = categories.length === 1 && services.length > 0 && services.length <= 4;
  const singleCategoryLabel = isSingleCategoryGroup ? categories[0] : null;
  const singleJurisdictionLabel = isSingleCategoryGroup
    ? (valueOf(services[0], 'jurisdiction') || valueOf(mda, 'jurisdiction') || 'Within Nigeria')
    : null;
  return (
    <div className="page-shell space-y-5 py-5 sm:space-y-6 sm:py-8">
      <section className="surface-card p-4 sm:p-6">
        <div className="flex flex-col items-center gap-2.5 text-center lg:flex-row lg:items-start lg:justify-between lg:text-left">
          <div className="flex min-w-0 flex-col items-center gap-2.5 lg:flex-row lg:items-start lg:gap-4">
            <MdaLogo name={name} acronym={acronym} slug={slug} size="large" />
            <div className="min-w-0">
              <p className="eyebrow">MDA profile</p>
              <h1 className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{name}</h1>
              {acronym ? <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">{acronym}</p> : null}
            </div>
          </div>
          {website ? <ExternalLink href={website} label={`Visit the official ${name} website (opens in a new tab)`}>Official website</ExternalLink> : null}
        </div>
      </section>

      {isSingleCategoryGroup ? (
        <section aria-labelledby="mda-services-heading">
          <div className="text-center sm:text-left">
            <p className="eyebrow">Services</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{singleJurisdictionLabel}</p>
            <h2 id="mda-services-heading" className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{singleCategoryLabel}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{formatCount(services.length)} {services.length === 1 ? 'service' : 'services'}</p>
          </div>
          <div className="mt-4 grid items-stretch gap-4 md:grid-cols-2">
            {services.map((service, index) => (
              <ServiceCard key={valueOf(service, 'id', 'slug') || index} service={service} compact />
            ))}
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="fee-coverage-title">
            <p id="fee-coverage-title" className="eyebrow">Fee coverage</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Mapped services" value={mappedServices === undefined ? '—' : formatCount(mappedServices)} />
              {verified !== undefined ? <MetricCard label="Verified fees" value={formatCount(verified)} /> : null}
              <MetricCard label="Source-supported — awaiting human review" value={typeof sourceSupported === 'number' ? formatCount(sourceSupported) : sourceSupported} />
              <MetricCard label="Pending" value={typeof pending === 'number' ? formatCount(pending) : pending} />
              <MetricCard label="Conflicting / unresolved" value={typeof unresolved === 'number' ? formatCount(unresolved) : unresolved} />
            </div>
          </section>
          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Service list</p>
                <h2 className="section-heading mt-2">Services linked to this MDA</h2>
              </div>
              {services.length ? <span className="text-sm text-slate-500">{formatCount(filteredServices.length)} of {formatCount(services.length)} listed</span> : null}
            </div>
            {categories.length > 1 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Service categories">
                <button type="button" className={`min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold ${selectedCategory === 'all' ? 'border-leaf bg-leaf text-white' : 'border-slate-300 bg-white text-slate-700'}`} aria-pressed={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')}>All services</button>
                {categories.map((category) => (
                  <button type="button" key={category} className={`min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold ${selectedCategory === category ? 'border-leaf bg-leaf text-white' : 'border-slate-300 bg-white text-slate-700'}`} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category}</button>
                ))}
              </div>
            ) : null}
            <div className="mt-5">
              {servicesState.status === 'loading' ? (
                <LoadingState label="Loading services…" />
              ) : servicesState.status === 'error' ? (
                <ErrorState title="Services are not available yet" description="This MDA profile loaded, but its public service list could not be reached." />
              ) : services.length === 0 ? (
                <EmptyState title="No services mapped yet" description="Services will appear here when they have been reviewed and added to the public catalogue." icon={Layers3} />
              ) : filteredServices.length === 0 ? (
                <EmptyState title="No services in this category" description="Choose another category to continue browsing the published records." icon={Layers3} />
              ) : (
                <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredServices.map((service, index) => (
                    <ServiceCard key={valueOf(service, 'id', 'slug') || index} service={service} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {officialChannels.length ? (
        <section>
          <p className="eyebrow">Official MDA channel</p>
          <h2 className="section-heading mt-2">Start from the official institution channel</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {officialChannels.map((channel, index) => (
              <OfficialChannelCard key={valueOf(channel, 'id', 'url') || index} channel={channel} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

