import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, Field, InlineNotice } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';
import { formatDate } from '../../lib/format';

const statuses = ['verified', 'pending', 'conflicting', 'unable_to_verify', 'superseded'];
const blank = { serviceId: '', feeOptionId: '', sourceId: '', status: 'pending', checkedAt: '', evidenceSummary: '', verificationMethod: '', notes: '' };

export function AdminVerificationsPage() {
  const [items, setItems] = useState(null);
  const [services, setServices] = useState([]);
  const [fees, setFees] = useState([]);
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(blank);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() {
    try {
      const [history, serviceData, feeData, sourceData] = await Promise.all([
        adminApi.verifications.list({ pageSize: 100, status: filter }), adminApi.services.list({ pageSize: 100 }),
        adminApi.fees.list({ pageSize: 100 }), adminApi.sources.list({ pageSize: 100 }),
      ]);
      setItems(history.items || []); setServices(serviceData.items || []); setFees(feeData.items || []); setSources(sourceData.items || []); setError('');
    } catch (requestError) { setError(requestError.message); setItems([]); }
  }
  useEffect(() => { load(); }, [filter]);
  const matchingFees = useMemo(() => fees.filter((fee) => !form.serviceId || Number(fee.serviceId) === Number(form.serviceId)), [fees, form.serviceId]);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await adminApi.verifications.create({
        ...form, serviceId: Number(form.serviceId), feeOptionId: form.feeOptionId ? Number(form.feeOptionId) : null,
        sourceId: form.sourceId ? Number(form.sourceId) : null,
        checkedAt: form.checkedAt ? new Date(form.checkedAt).toISOString() : undefined,
      });
      setForm(blank); setNotice('Verification decision recorded in immutable history.'); await load();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  return (
    <div>
      <AdminPageHeader title="Verification workflow" description="Record evidence-based decisions. History is append-only in the administration interface and reviewer identity comes from the authenticated session." />
      {error && <div className="mb-4"><AdminError message={error} /></div>}{notice && <div className="mb-4"><InlineNotice tone="success">{notice}</InlineNotice></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.78fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-extrabold text-navy">Verification history</h2><label className="flex items-center gap-2 text-xs font-bold text-slate-600">Status<select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-input w-auto py-2"><option value="">All</option>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label></div>
          {items === null ? <AdminLoading /> : items.length === 0 ? <AdminEmpty title="No verification history" message="Record a decision after evaluating authoritative evidence." /> : <div className="admin-panel divide-y divide-slate-200">{items.map((item) => <article key={item.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-extrabold text-navy">{item.serviceName}</p><p className="text-xs text-slate-500">{item.mdaName} · {item.reviewerName || item.checkedBy || 'Legacy reviewer'} · {formatDate(item.checkedAt)}</p></div><span className="admin-status">{item.status.replaceAll('_', ' ')}</span></div><p className="mt-2 text-sm leading-6 text-slate-700">{item.evidenceSummary}</p>{(item.previousValues || item.newValues) && <details className="mt-2 text-xs"><summary className="cursor-pointer font-bold text-leaf">Inspect recorded state</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-slate-100">{JSON.stringify({ previous: item.previousValues, current: item.newValues }, null, 2)}</pre></details>}</article>)}</div>}
        </section>
        <form onSubmit={submit} className="admin-panel h-fit space-y-4 p-4 sm:p-5 xl:sticky xl:top-24">
          <div><h2 className="font-extrabold text-navy">Record decision</h2><p className="text-sm text-slate-500">This action also updates the selected fee status.</p></div>
          <Field label="Service" name="verification-service" required>{(props) => <select {...props} className="admin-input" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value, feeOptionId: '' })} required><option value="">Select a service</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
          <Field label="Fee option" name="verification-fee">{(props) => <select {...props} className="admin-input" value={form.feeOptionId} onChange={(e) => setForm({ ...form, feeOptionId: e.target.value })}><option value="">Service-level decision</option>{matchingFees.map((item) => <option key={item.id} value={item.id}>{item.label || item.pricingModel} #{item.id}</option>)}</select>}</Field>
          <Field label="Primary source" name="verification-source">{(props) => <select {...props} className="admin-input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}><option value="">No single primary source</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</Field>
          <Field label="New status" name="verification-status" required>{(props) => <select {...props} className="admin-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>}</Field>
          <Field label="Evidence summary" name="verification-summary" required>{(props) => <textarea {...props} className="admin-input min-h-24" value={form.evidenceSummary} onChange={(e) => setForm({ ...form, evidenceSummary: e.target.value })} required />}</Field>
          <Field label="Verification method" name="verification-method" required>{(props) => <input {...props} className="admin-input" value={form.verificationMethod} onChange={(e) => setForm({ ...form, verificationMethod: e.target.value })} placeholder="e.g. approved fee schedule review" required />}</Field>
          <Field label="Checked date/time" name="verification-date">{(props) => <input {...props} type="datetime-local" className="admin-input" value={form.checkedAt} onChange={(e) => setForm({ ...form, checkedAt: e.target.value })} />}</Field>
          <Field label="Review notes" name="verification-notes">{(props) => <textarea {...props} className="admin-input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}</Field>
          <button type="submit" disabled={saving} className="primary-button">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{saving ? 'Recording…' : 'Record verification'}</button>
        </form>
      </div>
    </div>
  );
}
