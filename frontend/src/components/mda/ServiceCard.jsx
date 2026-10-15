import { ArrowRight, CalendarDays, ExternalLink as ExternalLinkIcon, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatFee, valueOf } from '../../lib/format';
import { ExternalLink } from '../common/ExternalLink';
import { StatusBadge } from '../common/StatusBadge';

export function ServiceCard({ service }) {
  const slug = valueOf(service, 'slug');
  const feeOptions = valueOf(service, 'feeOptions', 'fee_options') || [];
  const fee = feeOptions.length ? formatFee(feeOptions[0]) : { label: 'Fee not established', detail: 'No fee option is available to display.' };
  const officialUrl = valueOf(service, 'officialUrl', 'official_url', 'officialChannelUrl');
  return <article className="surface-card flex flex-col p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="break-words text-lg font-bold text-ink">{valueOf(service, 'name', 'title') || 'Unnamed service'}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{valueOf(service, 'description', 'summary') || 'Description not listed yet.'}</p></div><StatusBadge status={valueOf(service, 'verificationStatus', 'verification_status', 'status')} /></div><div className="mt-4 rounded-xl bg-[#f4f8f5] p-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Fee summary</p><p className="mt-1 text-lg font-black text-ink">{fee.label}</p><p className="mt-1 text-xs leading-5 text-slate-600">{fee.detail}</p></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" />Checked {formatDate(valueOf(service, 'lastChecked', 'last_checked', 'checkedAt'))}</span>{valueOf(service, 'category') ? <span className="inline-flex items-center gap-1"><Tag size={14} aria-hidden="true" />{valueOf(service, 'category')}</span> : null}</div><div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">{slug ? <Link className="text-button" to={`/services/${slug}`}>View details <ArrowRight size={16} aria-hidden="true" /></Link> : null}{officialUrl ? <ExternalLink href={officialUrl} className="min-h-11 text-xs"><ExternalLinkIcon size={14} aria-hidden="true" />Official channel</ExternalLink> : null}</div></article>;
}

