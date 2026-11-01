import { StatusBadge, getStatusMeta } from '../common/StatusBadge';

export function VerificationExplanation({ status, summary }) {
  const meta = getStatusMeta(status);
  const summaryText = summary && (summary.verified || summary.sourceSupported || summary.pending || summary.conflicting || summary.unableToVerify)
    ? `${summary.verified || 0} verified · ${summary.sourceSupported || 0} source-supported, awaiting review · ${summary.pending || 0} pending · ${summary.conflicting || 0} conflicting · ${summary.unableToVerify || 0} unable to verify`
    : null;
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink">What this status means</h3><StatusBadge status={status} /></div><p className="mt-3 text-sm leading-6 text-slate-600">{meta.meaning} FeeLens keeps the status visible so you can make an informed decision before continuing.</p>{summaryText ? <p className="mt-3 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">Current fee summary: {summaryText}</p> : null}</div>;
}

