import { BadgeDollarSign, Building2, FileSearch, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';
import { formatDate } from '../../lib/format';

const metricDefinitions = [
  ['totalMdas', 'Total MDAs'], ['activeMdas', 'Active MDAs'], ['totalServices', 'Total services'],
  ['activeServices', 'Active services'], ['feeOptions', 'Fee options'], ['verifiedFeeItems', 'Verified fee items'],
  ['pendingFeeItems', 'Pending'], ['conflictingFeeItems', 'Conflicting'],
  ['unableToVerifyItems', 'Unable to verify'], ['sources', 'Sources'], ['openFoiRequests', 'Open formal requests'],
];

const shortcuts = [
  ['/admin/mdas/new', 'Add MDA', Building2], ['/admin/services/new', 'Add service', Plus],
  ['/admin/fees/new', 'Add fee', BadgeDollarSign], ['/admin/sources/new', 'Add source', FileSearch],
  ['/admin/verifications?status=pending', 'Review verification', ShieldCheck],
];

export function AdminDashboardPage() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const load = () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    adminApi.dashboard().then((data) => setState({ loading: false, data, error: '' }))
      .catch((error) => setState({ loading: false, data: null, error: error.message }));
  };
  useEffect(load, []);

  return (
    <div>
      <AdminPageHeader title="Operations dashboard" description="A live view of FeeLens content coverage and verification work. Counts come from the database and are never substituted with sample data." />
      {state.loading && <AdminLoading label="Loading dashboard…" />}
      {state.error && <AdminError message={state.error} onRetry={load} />}
      {state.data && (
        <div className="space-y-5">
          <section aria-labelledby="coverage-title">
            <h2 id="coverage-title" className="mb-3 text-sm font-extrabold uppercase tracking-[0.12em] text-slate-500">Coverage</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {metricDefinitions.map(([key, label]) => (
                <div key={key} className="admin-panel min-w-0 p-4">
                  <p className="text-2xl font-black tabular-nums text-navy">{state.data.counts?.[key] ?? '—'}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="admin-panel p-4 sm:p-5" aria-labelledby="shortcuts-title">
            <h2 id="shortcuts-title" className="font-extrabold text-navy">Management shortcuts</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {shortcuts.map(([to, label, Icon]) => <Link key={to} to={to} className="secondary-button"><Icon className="h-4 w-4" /> {label}</Link>)}
            </div>
          </section>
          <section aria-labelledby="activity-title">
            <h2 id="activity-title" className="mb-3 font-extrabold text-navy">Recent verification activity</h2>
            {!state.data.recentVerificationActivity?.length ? (
              <AdminEmpty title="No verification activity yet" message="Create an MDA, service and fee, attach evidence, then record a verification decision." />
            ) : (
              <div className="admin-panel divide-y divide-slate-200">
                {state.data.recentVerificationActivity.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-navy">{item.serviceName}</p>
                      <p className="truncate text-xs text-slate-500">{item.mdaName} · {item.reviewerName || 'Legacy reviewer'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      {item.status === 'verified' ? <ShieldCheck className="h-4 w-4 text-emerald-700" /> : <ShieldAlert className="h-4 w-4 text-amber-700" />}
                      {item.status.replaceAll('_', ' ')} · {formatDate(item.checkedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
