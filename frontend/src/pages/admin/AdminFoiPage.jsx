import { LoaderCircle, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, Field, InlineNotice } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';
import { formatDate } from '../../lib/format';

const blank = { serviceId: '', requestingBody: '', subject: '', requestReference: '', submittedAt: '', respondedAt: '', status: 'draft', requestText: '', responseSummary: '', sourceId: '' };

export function AdminFoiPage() {
  const [items, setItems] = useState(null);
  const [services, setServices] = useState([]);
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() {
    try {
      const [records, serviceData, sourceData] = await Promise.all([adminApi.foi.list({ pageSize: 100 }), adminApi.services.list({ pageSize: 100 }), adminApi.sources.list({ pageSize: 100 })]);
      setItems(records.items || []); setServices(serviceData.items || []); setSources(sourceData.items || []); setError('');
    } catch (requestError) { setError(requestError.message); setItems([]); }
  }
  useEffect(() => { load(); }, []);
  function startEdit(item) { setEditing(item.id); setForm({ ...blank, ...item, submittedAt: item.submittedAt?.slice(0, 10) || '', respondedAt: item.respondedAt?.slice(0, 10) || '', serviceId: item.serviceId || '', sourceId: item.sourceId || '' }); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = { ...form, serviceId: form.serviceId ? Number(form.serviceId) : null, sourceId: form.sourceId ? Number(form.sourceId) : null };
    try {
      if (editing) await adminApi.foi.update(editing, payload); else await adminApi.foi.create(payload);
      setNotice(`Formal request ${editing ? 'updated' : 'created'}.`); setEditing(null); setForm(blank); await load();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  return (
    <div>
      <AdminPageHeader title="Formal correspondence / FOI" description="Track formal requests when ordinary authoritative sources are insufficient. FOI is an exception workflow, not the default research route." />
      {error && <div className="mb-4"><AdminError message={error} /></div>}{notice && <div className="mb-4"><InlineNotice tone="success">{notice}</InlineNotice></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
        <section>{items === null ? <AdminLoading /> : items.length === 0 ? <AdminEmpty title="No formal requests" message="No request record is required until the evidence workflow genuinely needs one." /> : <div className="admin-panel divide-y divide-slate-200">{items.map((item) => <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-extrabold text-navy">{item.subject || item.requestingBody}</p><p className="truncate text-xs text-slate-500">{item.requestingBody} · {item.status} · Updated {formatDate(item.updatedAt)}</p></div><button type="button" onClick={() => startEdit(item)} className="secondary-button"><Pencil className="h-4 w-4" /> Edit</button></article>)}</div>}</section>
        <form onSubmit={submit} className="admin-panel h-fit space-y-4 p-4 sm:p-5 xl:sticky xl:top-24">
          <h2 className="font-extrabold text-navy">{editing ? 'Edit request' : 'Record a request'}</h2>
          <Field label="MDA / requesting body" name="foi-body" required>{(props) => <input {...props} className="admin-input" value={form.requestingBody} onChange={(e) => setForm({ ...form, requestingBody: e.target.value })} required />}</Field>
          <Field label="Related service" name="foi-service" required>{(props) => <select {...props} className="admin-input" value={form.serviceId || ''} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required><option value="">Select a service</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
          <Field label="Subject" name="foi-subject">{(props) => <input {...props} className="admin-input" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} />}</Field>
          <Field label="Reference" name="foi-reference">{(props) => <input {...props} className="admin-input" value={form.requestReference || ''} onChange={(e) => setForm({ ...form, requestReference: e.target.value })} />}</Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Submitted" name="foi-submitted">{(props) => <input {...props} type="date" className="admin-input" value={form.submittedAt || ''} onChange={(e) => setForm({ ...form, submittedAt: e.target.value })} />}</Field><Field label="Responded" name="foi-responded">{(props) => <input {...props} type="date" className="admin-input" value={form.respondedAt || ''} onChange={(e) => setForm({ ...form, respondedAt: e.target.value })} />}</Field></div>
          <Field label="Status" name="foi-status" required>{(props) => <select {...props} className="admin-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['draft', 'submitted', 'acknowledged', 'responded', 'closed', 'withdrawn'].map((item) => <option key={item}>{item}</option>)}</select>}</Field>
          <Field label="Request text / notes" name="foi-request">{(props) => <textarea {...props} className="admin-input min-h-24" value={form.requestText || ''} onChange={(e) => setForm({ ...form, requestText: e.target.value })} />}</Field>
          <Field label="Response summary" name="foi-response">{(props) => <textarea {...props} className="admin-input min-h-24" value={form.responseSummary || ''} onChange={(e) => setForm({ ...form, responseSummary: e.target.value })} />}</Field>
          <Field label="Response source" name="foi-source">{(props) => <select {...props} className="admin-input" value={form.sourceId || ''} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}><option value="">No source linked</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</Field>
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="primary-button">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editing ? 'Save request' : 'Add request'}</button>{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}</div>
        </form>
      </div>
    </div>
  );
}
