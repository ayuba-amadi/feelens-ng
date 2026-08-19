import { ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router'
import PageIntro from '../components/common/PageIntro'
import VerificationBadge from '../components/service/VerificationBadge'
import { agencies } from '../data/agencies.js'
import { services } from '../data/services.js'
import { sources } from '../data/sources.js'
import { getAgencyBySlug, getServicesByAgency, getServiceVerificationStatus } from '../utils/selectors.js'
import { getAgencyCoverage } from '../utils/dataMetrics.js'
import { formatFee } from '../utils/formatFee.js'
import NotFoundPage from './NotFoundPage'

function AgencyDetailPage() {
  const { slug } = useParams()
  const agency = getAgencyBySlug(agencies, slug)
  if (!agency) return <NotFoundPage />
  const agencyServices = getServicesByAgency(services, agency.id)
  const coverage = getAgencyCoverage(agency, services, sources)
  return <><PageIntro eyebrow="Pilot institution" title={agency.name} description={agency.description} /><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10"><div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Institution details</p><p className="mt-3 font-bold text-slate-900">{agency.acronym || 'Acronym not recorded'}</p><p className="mt-1 text-sm uppercase text-slate-500">{agency.jurisdiction}</p>{agency.officialWebsite && <a href={agency.officialWebsite} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex max-w-full items-center gap-2 break-words text-sm font-semibold text-emerald-700">Official website <ExternalLink size={15} /></a>}</section><section className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Indexed coverage</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-950">{coverage.services}</p><p className="text-xs text-slate-500">Services</p></div><div><p className="text-2xl font-bold text-emerald-700">{coverage.verifiedFeeOptions}</p><p className="text-xs text-slate-500">Verified</p></div><div><p className="text-2xl font-bold text-amber-700">{coverage.pendingFeeOptions}</p><p className="text-xs text-slate-500">Pending</p></div><div><p className="text-2xl font-bold text-slate-600">{coverage.notLocatedFeeOptions}</p><p className="text-xs text-slate-500">Publication gaps</p></div></div>{coverage.conflictingFeeOptions > 0 && <p className="mt-4 text-sm font-semibold text-red-700">{coverage.conflictingFeeOptions} conflicting fee options require further verification.</p>}</section></div><p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">Coverage reflects records currently indexed by FeeLens and should not be interpreted as a complete inventory of all services offered by this institution.</p><section className="mt-10"><h2 className="text-2xl font-bold tracking-tight text-slate-950">Indexed services</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{agencyServices.map((service) => { const status = getServiceVerificationStatus(service); return <Link key={service.id} to={`/services/${service.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><div className="flex items-start justify-between gap-4"><h3 className="font-bold text-slate-900">{service.name}</h3><VerificationBadge status={status} publicationStatus={service.feeOptions.some((feeOption) => feeOption.publicationStatus === 'not_located') ? 'not_located' : service.publicationStatus} /></div><p className="mt-4 text-lg font-bold text-slate-950">{service.feeOptions.length === 1 ? formatFee(service.feeOptions[0]) : 'Multiple fee options'}</p></Link>})}</div></section></div></>
}

export default AgencyDetailPage
