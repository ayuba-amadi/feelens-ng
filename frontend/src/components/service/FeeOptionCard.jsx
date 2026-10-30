import { AlertCircle, Calculator, CheckCircle2, Coins, GitCompareArrows, HelpCircle, Percent, Repeat2 } from 'lucide-react';
import { asArray, formatFee, valueOf } from '../../lib/format';
import { StatusBadge } from '../common/StatusBadge';
import { EvidenceCard } from './EvidenceCard';

const modelIcons = { fixed: Coins, free: CheckCircle2, range: Coins, percentage: Percent, formula: Calculator, variable: Repeat2, unknown: HelpCircle };

export function FeeOptionCard({ option, index = 0, showEvidence = false }) {
  const model = String(valueOf(option, 'pricingModel', 'pricing_model', 'model') || 'unknown').toLowerCase();
  const fee = formatFee(option);
  const Icon = modelIcons[model] || HelpCircle;
  const status = valueOf(option, 'verificationStatus', 'verification_status', 'status');
  const sources = asArray(option.sources);
  return <article className={`rounded-2xl border p-4 sm:p-5 ${model === 'unknown' || model === 'variable' ? 'border-slate-300 bg-slate-50' : model === 'free' ? 'border-emerald-200 bg-emerald-50/40' : 'border-leaf/20 bg-white'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/10 text-leaf"><Icon size={19} aria-hidden="true" /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{valueOf(option, 'label', 'name') || `Fee option ${index + 1}`}</p><h3 className="mt-1 break-words text-2xl font-black tracking-tight text-ink">{fee.label}</h3></div></div>{status ? <StatusBadge status={status} /> : null}</div><p className="mt-3 text-sm leading-6 text-slate-600">{fee.detail}</p>{valueOf(option, 'conditions') ? <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-600">Conditions: {valueOf(option, 'conditions')}</p> : null}{valueOf(option, 'notes', 'description') ? <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-600">{valueOf(option, 'notes', 'description')}</p> : null}{status === 'conflicting' ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange-800"><GitCompareArrows size={14} aria-hidden="true" /> Sources disagree; no option was silently selected.</p> : null}{model === 'unknown' ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><AlertCircle size={14} aria-hidden="true" /> Unknown does not mean zero.</p> : null}{showEvidence ? <div className="mt-4 space-y-3"><p className="text-sm font-bold text-ink">Supporting sources</p>{sources.length ? sources.map((source, sourceIndex) => <EvidenceCard key={source.id || sourceIndex} source={source} />) : <p className="text-sm text-slate-600">No source association is available for this option.</p>}</div> : null}</article>;
}

