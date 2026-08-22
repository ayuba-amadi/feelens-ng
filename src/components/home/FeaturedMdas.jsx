import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { getMdaCatalog } from '../../data/mdaCatalog.js'
import MdaCard from '../mda/MdaCard.jsx'

function FeaturedMdas() {
  const featured = getMdaCatalog().filter((mda) => mda.coverageStatus === 'live').slice(0, 8)
  return <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Live coverage</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Featured MDAs</h2></div><Link to="/mdas" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800">Explore all MDAs <ArrowRight size={16} /></Link></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{featured.map((mda) => <MdaCard key={mda.id} mda={mda} compact />)}</div></div></section>
}

export default FeaturedMdas
