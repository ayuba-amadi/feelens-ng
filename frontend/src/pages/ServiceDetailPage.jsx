import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, ShieldCheck } from 'lucide-react';
import { publicApi } from '../lib/api';
import { useApiResource } from '../hooks/use-api';
import { asArray, formatCurrency, formatDate, formatFee, formatSourceType, valueOf } from '../lib/format';
import { nimcPdfPage, nimcSectionLabel } from '../lib/nimc';
import { ExternalLink } from '../components/common/ExternalLink';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { FeeOptionCard } from '../components/service/FeeOptionCard';
import { EvidenceCard } from '../components/service/EvidenceCard';
import { OfficialChannelCard } from '../components/service/OfficialChannelCard';
import { VerificationExplanation } from '../components/service/VerificationExplanation';

export function ServiceDetailPage() {
  const { slug } = useParams();
  const [feeQuery, setFeeQuery] = useState('');
  const state = useApiResource((options) => publicApi.getServiceBySlug(slug, options), [slug]);
  if (state.status === 'loading') return <div className="page-shell py-8"><LoadingState label="Loading service details…" /></div>;
  if (state.status === 'error') return <div className="page-shell py-8"><ErrorState title={state.error?.code === 'not_found' ? 'Service not found' : 'Service details are not available'} description={state.error?.code === 'not_found' ? 'This public service record does not exist in FeeLens.' : 'FeeLens could not load this service record. Please try again shortly.'} /></div>;

  const service = state.data || {};
  const status = valueOf(service, 'verificationStatus', 'verification_status', 'status');
  const feeOptions = asArray(valueOf(service, 'feeOptions', 'fee_options', 'fees'));
  const feeSearch = feeQuery.trim().toLowerCase();
  const visibleFeeOptions = feeSearch ? feeOptions.filter((option) => JSON.stringify(option).toLowerCase().includes(feeSearch)) : feeOptions;
  const requirements = asArray(valueOf(service, 'requirements', 'requirementsList'));
  const procedure = asArray(valueOf(service, 'procedure', 'steps', 'process', 'processSteps'));
  const channels = asArray(valueOf(service, 'officialChannels', 'official_channels', 'channels'));
  const sources = asArray(valueOf(service, 'sources', 'evidence', 'feeSources', 'fee_sources'));
  const mdaValue = valueOf(service, 'mdaName', 'mda_name', 'mda');
  const mdaName = typeof mdaValue === 'object' ? valueOf(mdaValue, 'name', 'fullName') : mdaValue;
  const mdaAcronym = valueOf(service, 'mdaAcronym', 'mda_acronym') || (typeof service.mda === 'object' ? valueOf(service.mda, 'acronym') : null);
  const mdaSlug = valueOf(service, 'mdaSlug', 'mda_slug') || (typeof service.mda === 'object' ? valueOf(service.mda, 'slug') : null);
  const officialUrl = valueOf(service, 'officialUrl', 'official_url');
  const description = valueOf(service, 'description', 'summary');
  const isShortSubtitle = description && String(description).trim().length <= 80;
  const jurisdiction = valueOf(service, 'jurisdiction');
  const category = valueOf(service, 'category');
  const lastChecked = valueOf(service, 'lastChecked', 'last_checked', 'checkedAt');
  const primarySource = sources[0] || null;
  const primarySourceUrl = primarySource ? valueOf(primarySource, 'url', 'officialUrl', 'official_url') : null;
  const primarySourcePdfPage = primarySource ? nimcPdfPage(primarySource) : null;
  const primarySourceHref = primarySourceUrl
    ? (primarySourceUrl.includes('#page=') || !primarySourcePdfPage ? primarySourceUrl : `${primarySourceUrl}#page=${primarySourcePdfPage}`)
    : officialUrl;
  const primarySourceSection = primarySource ? (nimcSectionLabel(primarySource) || valueOf(primarySource, 'pageOrSection', 'documentReference')) : null;
  const isSingleSimpleFee = feeOptions.length === 1 && String(status).toLowerCase() !== 'conflicting';
  const primaryFee = feeOptions.length === 1 ? formatFee(feeOptions[0]) : null;
  const sourceTypeLabel = primarySource
    ? (['official_document', 'service_level_agreement', 'official_guideline'].includes(String(valueOf(primarySource, 'sourceType', 'source_type') || '').toLowerCase())
      ? 'Official MDA document'
      : formatSourceType(valueOf(primarySource, 'sourceType', 'source_type')) || 'Official MDA document')
    : 'Official MDA document';
  const isNipcSlaService = mdaSlug === 'nipc';
  const responsibleAgency = slug === 'osic-export-certificate-registration'
    ? 'Nigerian Export Promotion Council (NEPC)'
    : isNipcSlaService ? 'Nigerian Investment Promotion Commission (NIPC)' : null;
  const timeline = String(description || '').match(/Timeline:\s*(.*?)(?:\.|$)/i)?.[1]?.trim();

  return (
    <div className="page-shell space-y-5 py-5 sm:space-y-6 sm:py-8">
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          {mdaSlug ? (
            <Link to={`/mdas/${mdaSlug}`} className="eyebrow hover:underline">
              {mdaAcronym || mdaName || 'Public service'}
            </Link>
          ) : (
            <p className="eyebrow">{mdaAcronym || mdaName || 'Public service'}</p>
          )}
          <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-ink sm:text-4xl">
            {valueOf(service, 'name', 'title') || 'Unnamed service'}
          </h1>
          {responsibleAgency ? <p className="mt-2 text-sm font-semibold text-slate-700">Responsible agency: {responsibleAgency}</p> : null}
          {isNipcSlaService && timeline ? (
            <div className="mt-4 w-full rounded-2xl border border-leaf/20 bg-[#f4f8f5] p-4 text-left sm:max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Timeline</p>
              <p className="mt-1 text-base font-semibold leading-6 text-ink">{timeline}</p>
            </div>
          ) : null}
          {description && !isNipcSlaService ? (
            <p className={`mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 ${isShortSubtitle ? 'text-center sm:text-left font-medium' : 'text-left mt-2.5'}`}>
              {description}
            </p>
          ) : null}
          {jurisdiction || category ? (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 sm:justify-start">
              {jurisdiction ? <span>{jurisdiction}</span> : null}
              {jurisdiction && category ? <ChevronRight size={13} className="text-slate-400" aria-hidden="true" /> : null}
              {category ? <span>{category}</span> : null}
            </div>
          ) : null}

          {isSingleSimpleFee && primaryFee ? (
            <div className="mt-4 w-full rounded-2xl border border-leaf/20 bg-[#f4f8f5] p-4 sm:max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Official fee</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">{primaryFee.label}</p>
              {String(valueOf(feeOptions[0], 'pricingModel', 'pricing_model')).toLowerCase() === 'percentage'
                && valueOf(feeOptions[0], 'maximumAmount', 'maxAmount', 'max_amount') !== undefined ? (
                <p className="mt-1 text-sm font-semibold text-ink">Cap: {formatCurrency(valueOf(feeOptions[0], 'maximumAmount', 'maxAmount', 'max_amount'), valueOf(feeOptions[0], 'currency') || 'NGN')}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusBadge status={status} />
              </div>
              {primaryFee.detail ? <p className="mt-2.5 text-left text-xs leading-5 text-slate-600">{primaryFee.detail}</p> : null}
              {valueOf(feeOptions[0], 'notes') ? <p className="mt-2.5 border-t border-slate-200/80 pt-2.5 text-left text-xs leading-5 text-slate-600">{valueOf(feeOptions[0], 'notes')}</p> : null}
              {valueOf(feeOptions[0], 'conditions') ? (
                <p className="mt-2.5 border-t border-slate-200/80 pt-2.5 text-left text-xs leading-5 text-slate-600">
                  Conditions: {valueOf(feeOptions[0], 'conditions')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <StatusBadge status={status} />
              {mdaName ? <span className="text-sm text-slate-500">{mdaName}</span> : null}
            </div>
          )}

          <div className="mt-4 flex w-full flex-col items-center gap-2 border-t border-slate-200 pt-3.5 text-xs text-slate-600 sm:flex-row sm:justify-between">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden="true" />
              Last verified: {formatDate(lastChecked)}
            </span>
            {primarySourceHref ? (
              <ExternalLink href={primarySourceHref} className="min-h-9 text-xs">
                {primarySourceUrl?.startsWith('https://feelens.ng/sources/') ? 'View evidence copy' : 'View official source'}
              </ExternalLink>
            ) : null}
          </div>
        </div>
      </section>

      {!isSingleSimpleFee ? (
        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Primary fee answer</p>
              <h2 className="section-heading mt-2">Fee options</h2>
            </div>
            <p className="text-sm text-slate-500">Each option is shown separately.</p>
          </div>
          {feeOptions.length > 12 ? (
            <div className="surface-card mt-4 p-4">
              <label className="block text-sm font-semibold text-ink" htmlFor="fee-option-filter">Find a country or fee option</label>
              <input id="fee-option-filter" value={feeQuery} onChange={(event) => setFeeQuery(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink" placeholder="Search by country, visa class or condition" />
              <p className="mt-2 text-xs text-slate-500">Showing {visibleFeeOptions.length} of {feeOptions.length} fee options. A dash, blank or N/A remains unresolved; it is not treated as free.</p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {feeOptions.length ? (
              visibleFeeOptions.length ? (
                visibleFeeOptions.map((option, index) => (
                  <FeeOptionCard key={valueOf(option, 'id') || index} option={option} index={feeOptions.indexOf(option)} showEvidence={String(status).toLowerCase() === 'conflicting'} />
                ))
              ) : (
                <EmptyState title="No fee options match this search" description="Try a country, class or condition from the source." />
              )
            ) : (
              <EmptyState title="Fee information not available yet" description="No fee option has been supplied for this service. That is not the same as free." />
            )}
          </div>
        </section>
      ) : null}

      {channels.length && !isSingleSimpleFee ? (
        <section>
          <p className="eyebrow">Continue officially</p>
          <h2 className="section-heading mt-2">Official service channel</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {channels.map((channel, index) => <OfficialChannelCard key={valueOf(channel, 'id', 'url') || index} channel={channel} />)}
          </div>
        </section>
      ) : null}

      {requirements.length || procedure.length ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {requirements.length ? (
            <section>
              <p className="eyebrow">Before you start</p>
              <h2 className="section-heading mt-2">Required documents</h2>
              <div className="mt-4"><ul className="surface-card divide-y divide-slate-100 p-1">
                {requirements.map((requirement, index) => {
                  const items = Array.isArray(requirement?.items) ? requirement.items : null;
                  return <li key={index} className="flex gap-3 p-4 text-sm leading-6 text-slate-700"><ShieldCheck size={17} className="mt-1 shrink-0 text-leaf" aria-hidden="true" />{items ? <div className="min-w-0"><h3 className="font-bold text-ink">{requirement.title}</h3><ul className="mt-2 list-disc space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul></div> : typeof requirement === 'string' ? requirement : valueOf(requirement, 'name', 'description', 'label') || 'Requirement not described'}</li>;
                })}
              </ul></div>
            </section>
          ) : null}
          {procedure.length ? <section><p className="eyebrow">Process</p><h2 className="section-heading mt-2">How the service works</h2><div className="mt-4"><ol className="space-y-3">{procedure.map((step, index) => <li key={index} className="surface-card flex gap-3 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-black text-white">{index + 1}</span><span className="text-sm leading-6 text-slate-700">{typeof step === 'string' ? step : valueOf(step, 'title', 'description', 'name') || 'Procedure step not described'}</span></li>)}</ol></div></section> : null}
        </div>
      ) : null}

      {String(status).toLowerCase() === 'conflicting' ? (
        <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
          <strong>Conflicting official information</strong>
          <p className="mt-1">FeeLens has not selected one amount because the authoritative sources currently disagree.</p>
        </div>
      ) : null}

      <section>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Source</p>
            <h2 className="section-heading mt-1">Official evidence</h2>
          </div>
          {sources.length > 1 ? (
            <p className="text-sm text-slate-500">{sources.length} sources</p>
          ) : null}
        </div>
        <div className="mt-3">
          {sources.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {sources.map((source, index) => (
                <EvidenceCard key={valueOf(source, 'id', 'url') || index} source={source} />
              ))}
            </div>
          ) : (
            <EmptyState title="Evidence is not available yet" description="This record needs an authoritative source before FeeLens can present a confirmed fee." />
          )}
        </div>
      </section>

      <details className="surface-card px-4">
        <summary className="min-h-11 cursor-pointer py-3 font-bold text-ink">How this fee was verified</summary>
        <div className="space-y-3 border-t border-slate-100 pb-4 pt-3 text-left text-sm text-slate-700">
          <dl className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Evidence level</dt>
              <dd className="mt-0.5 text-slate-800">{sourceTypeLabel}</dd>
            </div>
            {primarySource ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Source</dt>
                <dd className="mt-0.5 text-slate-800">{valueOf(primarySource, 'title', 'name')}</dd>
              </div>
            ) : null}
            {primarySource && valueOf(primarySource, 'publisher') ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Publisher</dt>
                <dd className="mt-0.5 text-slate-800">{valueOf(primarySource, 'publisher')}</dd>
              </div>
            ) : null}
            {primarySourceSection ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Section</dt>
                <dd className="mt-0.5 text-slate-800">{primarySourceSection}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Official amount</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {feeOptions.length ? feeOptions.map((option) => formatFee(option).label).join('; ') : 'Not available'}
              </dd>
            </div>
            {lastChecked ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Last verified by FeeLens</dt>
                <dd className="mt-0.5 text-slate-800">{formatDate(lastChecked)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Verification result</dt>
              <dd className="mt-1"><StatusBadge status={status} /></dd>
            </div>
            {primarySourceHref ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Official source</dt>
                <dd className="mt-0.5">
                  <ExternalLink href={primarySourceHref} className="min-h-8 text-xs">
                    View source
                  </ExternalLink>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </details>

      <VerificationExplanation status={status} summary={valueOf(service, 'verificationSummary')} />
      <p className="text-xs leading-5 text-slate-500">FeeLens is independent civic technology. It is not a government agency, payment processor, application portal, agent or middleman, and does not collect government payments. Review the linked official channel before completing a transaction.</p>
    </div>
  );
}

