import { ArrowRight, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { valueOf, formatCount } from '../../lib/format';
import { Monogram } from '../common/Monogram';
import { StatusBadge } from '../common/StatusBadge';

export function MdaCard({ mda }) {
  const slug = valueOf(mda, 'slug');
  const name = valueOf(mda, 'name', 'fullName') || 'Unnamed MDA';
  const services = valueOf(mda, 'serviceCount', 'service_count', 'mappedServices');
  return <article className="surface-card flex min-h-[214px] flex-col p-4 transition hover:-translate-y-0.5 hover:border-leaf/40 sm:p-5"><div className="flex items-start gap-3"><Monogram name={name} acronym={valueOf(mda, 'acronym', 'shortName')} /><div className="min-w-0"><h3 className="break-words font-bold leading-6 text-ink">{name}</h3><p className="mt-1 text-xs text-slate-500">{valueOf(mda, 'entityType', 'entity_type') || 'Entity type not listed'}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={valueOf(mda, 'coverageStatus', 'coverage_status', 'status')} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{valueOf(mda, 'jurisdiction') || 'Jurisdiction not listed'}</span></div><div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Layers3 size={16} className="text-leaf" aria-hidden="true" /><span>{services === undefined ? 'Mapped services not listed' : `${formatCount(services)} mapped service${Number(services) === 1 ? '' : 's'}`}</span></div><div className="mt-auto pt-4">{slug ? <Link className="text-button" to={`/mdas/${slug}`}>View services <ArrowRight size={16} aria-hidden="true" /></Link> : <span className="text-xs text-slate-400">Public link not available</span>}</div></article>;
}

