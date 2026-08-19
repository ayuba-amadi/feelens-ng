import { Link } from 'react-router'
import VerificationBadge from './VerificationBadge'

const categoryLabel = (category) => category?.replaceAll('_', ' ')

function ServiceHeader({ service, agency, status, publicationStatus }) {
  return <div className="border-b border-slate-200 bg-slate-50">
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb"><Link to="/" className="hover:text-emerald-700">Home</Link><span className="px-2">›</span><Link to="/services" className="hover:text-emerald-700">Services</Link><span className="px-2">›</span><span className="text-slate-700">{service.name}</span></nav>
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{service.name}</h1><p className="mt-4 text-base text-slate-600"><Link to={`/agencies/${agency.slug}`} className="font-semibold text-emerald-700 hover:text-emerald-800">{agency.name}{agency.acronym ? ` (${agency.acronym})` : ''}</Link></p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{service.jurisdiction.toUpperCase()}</span><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{categoryLabel(service.category)}</span>{service.userTypes.map((userType) => <span key={userType} className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{userType}</span>)}</div></div>
        <VerificationBadge status={status} publicationStatus={publicationStatus ?? service.publicationStatus} />
      </div>
    </div>
  </div>
}

export default ServiceHeader
