import { BriefcaseBusiness, CarFront, FileText, IdCard, Landmark, ReceiptText } from 'lucide-react'
import { Link } from 'react-router'

const popularServices = [{ label: 'Identity', icon: IdCard }, { label: 'Passports', icon: FileText }, { label: 'Business Registration', icon: BriefcaseBusiness }, { label: 'Driver Licensing', icon: CarFront }, { label: 'Marriage Services', icon: Landmark }, { label: 'Tax & Revenue', icon: ReceiptText }]

function PopularServices() {
  return <section id="services" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Browse by intent</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Popular services</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">Start with a category when you know what you need, but not the exact government service name.</p></div><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{popularServices.map(({ label, icon: Icon }) => <Link key={label} to="/services" className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-200/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><Icon size={21} className="text-emerald-600" aria-hidden="true" /><span className="mt-7 block text-sm font-semibold leading-5 text-slate-800 group-hover:text-emerald-700">{label}</span></Link>)}</div></section>
}

export default PopularServices
