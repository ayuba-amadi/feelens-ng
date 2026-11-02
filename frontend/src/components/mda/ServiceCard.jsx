import { ArrowRight, CalendarDays, ExternalLink as ExternalLinkIcon, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatFee, valueOf } from '../../lib/format';
import { ExternalLink } from '../common/ExternalLink';
import { StatusBadge } from '../common/StatusBadge';

export function ServiceCard({ service, compact = false }) {
  const slug = valueOf(service, 'slug');
  const feeOptions = valueOf(service, 'feeOptions', 'fee_options') || [];
  const status = String(valueOf(service, 'verificationStatus', 'verification_status', 'status') || '').toLowerCase();
  const fee = status === 'conflicting'
    ? { label: 'Conflicting fee options', detail: 'Authoritative records disagree. Review the evidence before paying.' }
    : feeOptions.length ? formatFee(feeOptions[0]) : { label: 'Fee not established', detail: 'No fee option is available to display.' };
  const subtitle = valueOf(service, 'description', 'summary');
  const showShortSubtitle = subtitle && String(subtitle).trim().length > 0 && String(subtitle).trim().length <= 80;
  const officialUrl = valueOf(service, 'officialUrl', 'official_url', 'officialChannelUrl');
  const sourceCount = valueOf(service, 'sourceCount');
  const checkedAt = valueOf(service, 'lastChecked', 'last_checked', 'checkedAt');
  const hasEvidence = valueOf(service, 'hasEvidence');
  const hasOfficialChannels = valueOf(service, 'hasOfficialChannels');
  const evidenceLabel = sourceCount !== undefined && sourceCount !== null
    ? `${sourceCount} source${Number(sourceCount) === 1 ? '' : 's'} available`
    : 'Evidence available';
  return (
    <article className="surface-card flex h-full flex-col p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold leading-6 text-ink">
            {valueOf(service, 'name', 'title') || 'Unnamed service'}
          </h3>
          {showShortSubtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {!compact ? <StatusBadge status={status} /> : null}
      </div>
      <div className="mt-3.5 rounded-xl bg-[#f4f8f5] p-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Official fee</p>
        <p className="mt-1 text-xl font-bold tracking-tight text-ink">{fee.label}</p>
      </div>
      {compact ? (
        <div className="mt-3.5 flex items-center justify-between gap-3 pt-1">
          <StatusBadge status={status} />
          {slug ? (
            <Link className="text-button" to={`/services/${slug}`}>
              View details <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {checkedAt || valueOf(service, 'category') || hasEvidence || hasOfficialChannels ? (
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4 text-xs text-slate-500">
              {checkedAt ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={14} aria-hidden="true" />
                  Checked {formatDate(checkedAt)}
                </span>
              ) : null}
              {valueOf(service, 'category') ? (
                <span className="inline-flex items-center gap-1">
                  <Tag size={14} aria-hidden="true" />
                  {valueOf(service, 'category')}
                </span>
              ) : null}
              {hasEvidence ? <span>{evidenceLabel}</span> : null}
              {hasOfficialChannels ? <span>Official channel available</span> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
            {slug ? (
              <Link className="text-button" to={`/services/${slug}`}>
                View details <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
            {officialUrl ? (
              <ExternalLink href={officialUrl} className="min-h-11 text-xs">
                <ExternalLinkIcon size={14} aria-hidden="true" />
                Official channel
              </ExternalLink>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

