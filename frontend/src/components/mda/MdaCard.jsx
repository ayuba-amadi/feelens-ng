import { ArrowRight, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { valueOf, formatCount } from '../../lib/format';
import { MdaLogo } from '../common/MdaLogo';
import { StatusBadge } from '../common/StatusBadge';

export function MdaCard({ mda }) {
  const slug = valueOf(mda, 'slug');
  const name = valueOf(mda, 'name', 'fullName') || 'Unnamed MDA';
  const services = valueOf(mda, 'serviceCount', 'service_count', 'mappedServices');
  const acronym = valueOf(mda, 'acronym', 'shortName');
  const jurisdictionValue = valueOf(mda, 'jurisdiction');
  const jurisdiction = ['Federal', 'Federal Capital Territory', 'State', 'Local'].includes(jurisdictionValue) ? jurisdictionValue : null;
  const coverageStatus = String(valueOf(mda, 'coverageStatus', 'coverage_status', 'status') || '').toLowerCase();
  const hasBadge = (coverageStatus && coverageStatus !== 'pilot') || jurisdiction;
  return <article className="surface-card flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:border-leaf/40 sm:p-[18px]"><div className="flex items-start gap-3"><MdaLogo name={name} acronym={acronym} slug={slug} /><div className="min-w-0"><h3 className="break-words font-semibold leading-6 text-ink">{name}</h3>{acronym ? <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{acronym}</p> : null}</div></div>{hasBadge ? <div className="mt-2 flex flex-wrap gap-2">{coverageStatus && coverageStatus !== 'pilot' ? <StatusBadge status={coverageStatus} /> : null}{jurisdiction ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{jurisdiction}</span> : null}</div> : null}{services !== undefined ? <div className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Layers3 size={16} className="text-leaf" aria-hidden="true" /><span>{formatCount(services)} service{Number(services) === 1 ? '' : 's'}</span></div> : null}<div className="mt-auto pt-3">{slug ? <Link className="text-button" to={`/mdas/${slug}`}>View services <ArrowRight size={16} aria-hidden="true" /></Link> : null}</div></article>;
}

