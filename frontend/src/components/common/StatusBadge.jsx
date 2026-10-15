import { CheckCircle2, Clock3, GitCompareArrows, HelpCircle, History } from 'lucide-react';
import { normalizeStatus } from '../../lib/format';

const statusMeta = {
  verified: { label: 'Verified', meaning: 'Supported by sufficient authoritative evidence.', icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  pending: { label: 'Pending', meaning: 'Current verification is still in progress.', icon: Clock3, classes: 'border-amber-200 bg-amber-50 text-amber-800' },
  conflicting: { label: 'Conflicting', meaning: 'Authoritative sources disagree.', icon: GitCompareArrows, classes: 'border-orange-200 bg-orange-50 text-orange-800' },
  unable_to_verify: { label: 'Unable to verify', meaning: 'A current authoritative amount could not be established.', icon: HelpCircle, classes: 'border-slate-300 bg-slate-100 text-slate-700' },
  superseded: { label: 'Superseded', meaning: 'This record has been replaced by newer information.', icon: History, classes: 'border-slate-300 bg-slate-100 text-slate-700' },
  status_not_listed: { label: 'Status not listed', meaning: 'The public record has not supplied a verification status.', icon: HelpCircle, classes: 'border-slate-200 bg-white text-slate-500' }
};

export function getStatusMeta(status) { return statusMeta[normalizeStatus(status)] || statusMeta.status_not_listed; }

export function StatusBadge({ status, showMeaning = false }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return <span className={`inline-flex max-w-full items-start gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.classes}`} title={meta.meaning}><Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0" /><span>{showMeaning ? `${meta.label}: ${meta.meaning}` : meta.label}</span></span>;
}

