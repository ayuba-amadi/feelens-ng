import { StatusBadge, getStatusMeta } from '../common/StatusBadge';

export function VerificationExplanation({ status }) {
  const meta = getStatusMeta(status);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink">What this status means</h3><StatusBadge status={status} /></div><p className="mt-3 text-sm leading-6 text-slate-600">{meta.meaning} FeeLens keeps the status visible so you can make an informed decision before continuing.</p></div>;
}

