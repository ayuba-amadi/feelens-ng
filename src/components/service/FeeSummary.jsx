import { formatFee } from '../../utils/formatFee.js'

function FeeSummary({ feeOption, prominent = false }) {
  return <div className={prominent ? 'rounded-2xl bg-slate-950 p-5 text-white' : ''}>
    <p className={`text-xs font-bold uppercase tracking-[0.16em] ${prominent ? 'text-emerald-300' : 'text-slate-400'}`}>Official fee</p>
    <p className={`mt-2 break-words text-2xl font-bold tracking-tight ${prominent ? 'text-white' : 'text-slate-950'}`}>{formatFee(feeOption)}</p>
  </div>
}

export default FeeSummary
