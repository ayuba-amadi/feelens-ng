import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatFee, valueOf } from '../../lib/format';
import { groupCacServices } from '../../lib/cac';
import { ServiceCard } from './ServiceCard';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../common/States';

export function CacCatalogue({ services, state }) {
  const [query, setQuery] = useState('');
  const { featuredGroups, otherServices } = useMemo(() => groupCacServices(services), [services]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOtherServices = normalizedQuery
    ? otherServices.filter((service) => `${service.name} ${service.category || ''} ${service.slug}`.toLowerCase().includes(normalizedQuery))
    : otherServices;

  if (state === 'loading') return <LoadingState label="Loading CAC services…" />;
  if (state === 'error') return <ErrorState title="CAC services are not available yet" description="The CAC profile loaded, but its service catalogue could not be reached." />;
  if (!services.length) return <EmptyState title="No CAC services are available" description="The CAC service catalogue returned no active services." />;

  return (
    <section aria-labelledby="cac-featured-heading" className="space-y-6">
      <header className="text-center">
        <p className="eyebrow">Services</p>
        <h2 id="cac-featured-heading" className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Featured Services</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">10 selected services with official fee information and supporting evidence.</p>
      </header>

      {featuredGroups.map((group) => (
        <section key={group.key} aria-labelledby={`cac-${group.key}-heading`} className="space-y-3">
          <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:items-baseline sm:justify-between sm:text-left">
            <h3 id={`cac-${group.key}-heading`} className="text-xl font-semibold tracking-tight text-ink">{group.label}</h3>
            <p className="text-sm font-medium text-slate-600">{group.services.length} of {group.slugs.length} services</p>
          </div>
          <div className="grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
            {group.services.map((service) => <ServiceCard key={service.slug} service={service} compact />)}
          </div>
        </section>
      ))}

      {otherServices.length ? (
        <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf sm:px-5">
            <span className="min-w-0">
              <span className="block font-semibold text-ink">Other CAC Services</span>
              <span className="mt-0.5 block text-sm text-slate-600">Additional CAC services preserved in the FeeLens catalogue. These are not part of the currently featured service set.</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{otherServices.length}</span>
              <ChevronDown size={18} aria-hidden="true" className="text-slate-500 transition-transform open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-slate-200 p-3 sm:p-4">
            <label htmlFor="cac-other-service-search" className="sr-only">Search other CAC services</label>
            <div className="relative">
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="cac-other-service-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search other CAC services"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-ink placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              />
            </div>
            <ul className="mt-3 divide-y divide-slate-100" aria-label="Other CAC services">
              {filteredOtherServices.map((service) => {
                const feeOptions = valueOf(service, 'feeOptions', 'fee_options') || [];
                const feeSummary = feeOptions.length > 1 ? `${feeOptions.length} fee options` : feeOptions.length ? formatFee(feeOptions[0]).label : 'Fee not established';
                const status = valueOf(service, 'verificationStatus', 'verification_status', 'status');
                return (
                  <li key={service.slug} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Link to={`/services/${service.slug}`} className="group flex min-h-10 min-w-0 items-center gap-1.5 font-medium leading-5 text-ink hover:text-leaf focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf">
                        <span className="break-words">{service.name}</span>
                        <ArrowRight size={15} aria-hidden="true" className="shrink-0 opacity-70" />
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                        <span className="text-sm font-semibold text-slate-700">{feeSummary}</span>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  </li>
                );
              })}
              {!filteredOtherServices.length ? <li className="py-4 text-sm text-slate-600">No other service matches that search.</li> : null}
            </ul>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">Verification labels reflect each service’s stored evidence state.</p>
          </div>
        </details>
      ) : null}
    </section>
  );
}
