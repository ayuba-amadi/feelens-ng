import { ArrowRight, BriefcaseBusiness, Building2, Droplets, Fingerprint, HeartPulse, Landmark, Map, Plane, ReceiptText, Zap } from 'lucide-react'
import { Link } from 'react-router'

const icons = { Identity: Fingerprint, Business: BriefcaseBusiness, Revenue: ReceiptText, 'Land & planning': Map, Utilities: Droplets, 'Health regulation': HeartPulse, Aviation: Plane, Energy: Zap }

function MdaCard({ mda, compact = false }) {
  const Icon = icons[mda.category] ?? (mda.entityType === 'Commission' ? Landmark : Building2)
  const card = <article className={`group relative h-full overflow-hidden rounded-2xl border border-slate-200 ${mda.coverageStatus === 'live' ? 'bg-white' : 'bg-slate-50/70'} ${compact ? 'p-4' : 'p-5'} shadow-sm transition ${mda.coverageStatus === 'live' ? 'hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-950/5' : ''}`}>
    <div className={`absolute right-0 top-0 size-24 -translate-y-8 translate-x-8 rounded-full ${mda.coverageStatus === 'live' ? 'bg-emerald-50' : 'bg-slate-100'}`} aria-hidden="true" />
    <div className="relative flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-emerald-300"><Icon size={20} /></span>{mda.coverageStatus === 'live' ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Live in demo</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Coming soon</span>}</div>
    <div className="relative mt-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">{mda.acronym || mda.entityType}</p><h2 className="mt-1 text-base font-bold leading-6 text-slate-900">{mda.name}</h2><p className="mt-2 text-sm text-slate-500">{mda.entityType} · {mda.jurisdiction === 'area_council' ? 'Area Council' : mda.jurisdiction.toUpperCase()}</p></div>
    <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm"><span className={mda.coverageStatus === 'live' ? 'font-semibold text-emerald-700' : 'text-slate-500'}>{mda.mappedServiceCount} services mapped</span>{mda.coverageStatus === 'live' ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700">View services <ArrowRight size={16} /></span> : <span className="text-xs font-medium text-slate-400">Coverage planned</span>}</div>
  </article>
  return mda.coverageStatus === 'live' ? <Link to={`/mdas/${mda.slug}`} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">{card}</Link> : card
}

export default MdaCard
