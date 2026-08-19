import { AlertTriangle, CheckCircle2, Clock3, HelpCircle } from 'lucide-react'
import { getPublicationLabel, getVerificationLabel } from '../../domain/verificationPolicy.js'

const styles = {
  verified: { className: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  pending: { className: 'border-amber-200 bg-amber-50 text-amber-800', icon: Clock3 },
  disputed: { className: 'border-red-200 bg-red-50 text-red-800', icon: AlertTriangle },
  unable_to_verify: { className: 'border-slate-200 bg-slate-100 text-slate-700', icon: HelpCircle },
  superseded: { className: 'border-slate-200 bg-slate-100 text-slate-600', icon: AlertTriangle },
}

function VerificationBadge({ status, publicationStatus }) {
  const effectiveStatus = status ?? 'unable_to_verify'
  const style = styles[effectiveStatus] ?? styles.unable_to_verify
  const Icon = style.icon
  const label = publicationStatus === 'not_located' ? getPublicationLabel(publicationStatus) : getVerificationLabel(effectiveStatus)
  return <span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${style.className}`}><Icon size={15} aria-hidden="true" />{label}</span>
}

export default VerificationBadge
