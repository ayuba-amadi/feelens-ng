import { ArrowUpRight } from 'lucide-react'
import { getPublicationLabel, getVerificationLabel } from '../../domain/verificationPolicy'

function ServiceCard({ service, onSelect }) {
  const hasConflict = service.publicationStatus === 'conflicting' || service.feeOptions?.some((feeOption) => feeOption.publicationStatus === 'conflicting' || feeOption.verificationStatus === 'disputed')
  const hasNotLocated = service.feeOptions?.some((feeOption) => feeOption.publicationStatus === 'not_located')
  const hasUnableToVerify = service.feeOptions?.some((feeOption) => feeOption.verificationStatus === 'unable_to_verify')
  const isVerified = !hasConflict && (service.verification?.status === 'verified' || service.feeOptions?.some((feeOption) => feeOption.verificationStatus === 'verified'))
  const status = hasConflict ? getVerificationLabel('disputed') : hasNotLocated ? getPublicationLabel('not_located') : hasUnableToVerify ? getVerificationLabel('unable_to_verify') : isVerified ? getVerificationLabel('verified') : getVerificationLabel('pending')
  const statusClass = hasConflict ? 'bg-amber-50 text-amber-700' : isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'

  return (
    <button type="button" onClick={() => onSelect?.(service)} className="group flex w-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-200/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
      <span><span className="block font-semibold text-slate-900">{service.name}</span><span className="mt-1 block text-sm text-slate-500">{service.agency} · {service.category}</span><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>{status}</span></span>
      <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-slate-400 transition group-hover:text-emerald-600" />
    </button>
  )
}

export default ServiceCard
