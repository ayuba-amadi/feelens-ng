import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router'
import FeaturedMdas from '../components/home/FeaturedMdas.jsx'
import HeroSearch from '../components/home/HeroSearch.jsx'
import HowItWorks from '../components/home/HowItWorks.jsx'
import TrustSection from '../components/home/TrustSection.jsx'
import { agencies } from '../data/agencies.js'
import { getMdaCatalog } from '../data/mdaCatalog.js'
import { services } from '../data/services.js'
import { sources } from '../data/sources.js'
import { getDatasetMetrics } from '../utils/dataMetrics.js'

function HomePage() {
  const metrics = getDatasetMetrics({ agencies, services, sources })
  const liveMdas = getMdaCatalog().filter((mda) => mda.coverageStatus === 'live').length
  const stats = [[liveMdas, 'MDAs live in demo'], [metrics.totalServices, 'Services mapped'], [metrics.verifiedFeeOptions, 'Verified fee items'], [getMdaCatalog().length, 'MDA coverage roadmap']]
  return <div id="top" className="bg-slate-50"><section className="relative overflow-hidden border-b border-slate-200"><div className="absolute -right-32 -top-40 size-96 rounded-full bg-emerald-100/70 blur-3xl" aria-hidden="true" /><div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10"><div className="mx-auto max-w-4xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700 shadow-sm"><span className="size-1.5 rounded-full bg-emerald-500" />Abuja CivicTech Pilot</span><h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl sm:leading-[1.08]">Know the official fee <span className="text-emerald-600">before you pay.</span></h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Search a service or explore the public institutions that provide it, with evidence and official channels kept in view.</p><HeroSearch /><p className="mt-4 text-xs text-slate-500">FeeLens is an independent civic-tech transparency project.</p></div></div></section><div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-5 sm:px-8 lg:grid-cols-4 lg:px-10">{stats.map(([value, label]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></div>)}</div><FeaturedMdas /><HowItWorks /><TrustSection /><section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-10"><div className="rounded-3xl bg-slate-950 p-6 sm:flex sm:items-center sm:justify-between sm:p-8"><div className="max-w-2xl"><h2 className="text-2xl font-bold tracking-tight text-white">Not sure what you should be paying?</h2><p className="mt-2 text-sm leading-6 text-slate-300">Find the published government fee, understand the procedure, and continue through the appropriate official channel.</p></div><div className="mt-5 flex flex-wrap gap-4 sm:mt-0"><Link to="/#verify" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">Verify a Fee <ArrowRight size={17} /></Link><Link to="/methodology" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-emerald-300">See how verification works <CheckCircle2 size={17} /></Link></div></div></section></div>
}

export default HomePage
