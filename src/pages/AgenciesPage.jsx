import { ArrowUpRight, Building2 } from 'lucide-react'
import { Link } from 'react-router'
import PageIntro from '../components/common/PageIntro'
import VerificationBadge from '../components/service/VerificationBadge'
import { agencies } from '../data/agencies.js'
import { services } from '../data/services.js'
import { sources } from '../data/sources.js'
import { getAgencyCoverage } from '../utils/dataMetrics.js'

function AgenciesPage() {
  return <><PageIntro eyebrow="Pilot institutions" title="Browse agencies" description="Explore the 15 institutions currently represented in the Abuja/FCT pilot. Coverage counts reflect records indexed by FeeLens, not a complete inventory of an institution’s services." /><div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-3 lg:px-10">{agencies.map((agency) => { const coverage = getAgencyCoverage(agency, services, sources); return <Link key={agency.id} to={`/agencies/${agency.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Building2 size={20} /></span><ArrowUpRight size={18} className="text-slate-400 group-hover:text-emerald-600" /></div><h2 className="mt-6 font-bold text-slate-900">{agency.name}</h2><p className="mt-1 text-sm text-slate-500">{agency.acronym || 'Institution'} · {agency.jurisdiction.toUpperCase()}</p><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><span className="rounded-lg bg-slate-50 p-2 text-slate-600">{coverage.services} services</span><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">{coverage.verifiedFeeOptions} verified</span><span className="rounded-lg bg-amber-50 p-2 text-amber-700">{coverage.pendingFeeOptions} pending</span><span className="rounded-lg bg-slate-50 p-2 text-slate-600">{coverage.notLocatedFeeOptions} gaps</span></div>{coverage.conflictingFeeOptions > 0 && <div className="mt-3"><VerificationBadge status="disputed" /></div>}</Link>})}</div></>
}

export default AgenciesPage
