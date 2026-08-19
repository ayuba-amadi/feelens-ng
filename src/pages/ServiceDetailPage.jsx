import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import EvidencePanel from '../components/service/EvidencePanel'
import FeeOptionCard from '../components/service/FeeOptionCard'
import OfficialChannels from '../components/service/OfficialChannels'
import PublicationGapNotice from '../components/service/PublicationGapNotice'
import ProcessSteps from '../components/service/ProcessSteps'
import RequirementsList from '../components/service/RequirementsList'
import ServiceHeader from '../components/service/ServiceHeader'
import VerificationSummary from '../components/service/VerificationSummary'
import { agencies } from '../data/agencies.js'
import { services } from '../data/services.js'
import { sources } from '../data/sources.js'
import { getAgencyById, getServiceBySlug, getServiceVerificationStatus, getSourcesForFeeOption, getSourcesForService } from '../utils/selectors.js'
import NotFoundPage from './NotFoundPage'

function ServiceDetailPage() {
  const { slug } = useParams()
  const service = getServiceBySlug(services, slug)
  if (!service) return <NotFoundPage />
  const agency = getAgencyById(agencies, service.agencyId)
  const status = getServiceVerificationStatus(service)
  const serviceSources = getSourcesForService(service, sources)
  const publicationStatus = service.feeOptions.some((feeOption) => feeOption.publicationStatus === 'not_located') ? 'not_located' : service.publicationStatus
  const checkedAt = serviceSources.map((source) => source.accessedAt).filter(Boolean).sort().at(-1)

  return <><ServiceHeader service={service} agency={agency} status={status} publicationStatus={publicationStatus} /><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10"><div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]"><div className="space-y-10"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Fee information</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Official fee options</h2><div className="mt-5 grid gap-4">{service.feeOptions.map((feeOption) => <FeeOptionCard key={feeOption.id} feeOption={feeOption} sources={getSourcesForFeeOption(feeOption, sources)} />)}</div></section>{status === 'unable_to_verify' && <PublicationGapNotice />}<RequirementsList requirements={service.requirements} /><ProcessSteps steps={service.processSteps} /><OfficialChannels channels={service.officialChannels} /></div><aside className="space-y-6 lg:sticky lg:top-24 lg:self-start"><VerificationSummary service={{ ...service, publicationStatus }} status={status} sourceCount={serviceSources.length} checkedAt={checkedAt} /><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600"><p className="font-bold text-slate-900">Independent information layer</p><p className="mt-2">FeeLens does not represent this institution, guarantee processing, determine legal liability, or replace the official government portal.</p></div></aside></div><Link to="/services" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"><ArrowLeft size={16} />Back to all services</Link><div className="mt-12"><EvidencePanel sources={serviceSources} /></div></div></>
}

export default ServiceDetailPage
