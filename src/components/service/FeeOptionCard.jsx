import { CalendarDays, Info } from 'lucide-react'
import FeeSummary from './FeeSummary'
import VerificationBadge from './VerificationBadge'

function FeeOptionCard({ feeOption, sources }) {
  const isConflict = feeOption.publicationStatus === 'conflicting' || feeOption.verificationStatus === 'disputed'
  return <article className={`rounded-2xl border p-5 ${isConflict ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{feeOption.label}</p><FeeSummary feeOption={feeOption} /></div>
      <VerificationBadge status={feeOption.verificationStatus} publicationStatus={feeOption.publicationStatus} />
    </div>
    <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
      {feeOption.conditions && <p className="flex gap-2"><Info size={16} className="mt-0.5 shrink-0 text-slate-400" /><span><strong className="font-semibold text-slate-800">Conditions:</strong> {feeOption.conditions}</span></p>}
      {feeOption.paymentNotes && <p className="flex gap-2"><Info size={16} className="mt-0.5 shrink-0 text-slate-400" /><span>{feeOption.paymentNotes}</span></p>}
      {feeOption.effectiveDate && <p className="flex gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-slate-400" /><span><strong className="font-semibold text-slate-800">Effective date:</strong> {feeOption.effectiveDate}</span></p>}
      {feeOption.currency && <p><strong className="font-semibold text-slate-800">Currency:</strong> {feeOption.currency}</p>}
    </div>
    {isConflict && <p className="mt-5 border-t border-red-200 pt-4 text-sm font-semibold leading-6 text-red-900">FeeLens does not select between conflicting official amounts without further verification.</p>}
    {sources.length > 0 && <p className="mt-4 text-xs text-slate-500">Evidence: {sources.map((source) => source.title).join('; ')}</p>}
  </article>
}

export default FeeOptionCard
