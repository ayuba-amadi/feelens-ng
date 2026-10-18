import { LoaderCircle, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, Field, InlineNotice } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';

const blank = { ownerType: 'service', serviceId: '', mdaId: '', channelType: 'portal', name: '', url: '', contactValue: '', instructions: '', isActive: true };

export function AdminChannelsPage() {
  const [items, setItems] = useState(null);
  const [services, setServices] = useState([]);
  const [mdas, setMdas] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [channelsData, serviceData, mdaData] = await Promise.all([adminApi.channels.list({ pageSize: 100 }), adminApi.services.list({ pageSize: 100 }), adminApi.mdas.list({ pageSize: 100 })]);
      setItems(channelsData.items || []); setServices(serviceData.items || []); setMdas(mdaData.items || []); setError('');
    } catch (requestError) { setError(requestError.message); setItems([]); }
  };
  useEffect(() => { load(); }, []);

  function startEdit(item) { setEditing(item.id); setForm({ ...blank, ...item, ownerType: item.mdaId && !item.serviceId ? 'mda' : 'service' }); setNotice(''); }
  function reset() { setEditing(null); setForm(blank); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const { ownerType, ...channelFields } = form;
      const payload = { ...channelFields, serviceId: ownerType === 'service' ? Number(form.serviceId) : undefined, mdaId: ownerType === 'mda' ? Number(form.mdaId) : undefined };
      if (editing) await adminApi.channels.update(editing, payload); else await adminApi.channels.create(payload);
      setNotice(`Official channel ${editing ? 'updated' : 'created'}.`); reset(); await load();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }

  return (
    <div>
      <AdminPageHeader title="Official channels" description="Maintain the official pages and contact channels users follow after reviewing FeeLens evidence." />
      {error && <div className="mb-4"><AdminError message={error} /></div>}
      {notice && <div className="mb-4"><InlineNotice tone="success">{notice}</InlineNotice></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)]">
        <section>
          {items === null && <AdminLoading />}
          {items?.length === 0 && <AdminEmpty title="No official channels yet" message="Add a channel after creating the related service." />}
          {!!items?.length && <div className="admin-panel divide-y divide-slate-200">{items.map((item) => (
            <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="break-words text-sm font-extrabold text-navy">{item.name}</p><p className="truncate text-xs text-slate-500">{item.serviceName || item.mdaName} · {item.channelType} · {item.isActive ? 'Active' : 'Inactive'}</p><p className="mt-1 break-all text-xs text-slate-500">{item.url || item.contactValue || 'No URL/contact value'}</p></div>
              <button type="button" onClick={() => startEdit(item)} className="secondary-button shrink-0"><Pencil className="h-4 w-4" /> Edit</button>
            </article>
          ))}</div>}
        </section>
        <form onSubmit={submit} className="admin-panel h-fit space-y-4 p-4 sm:p-5 xl:sticky xl:top-24">
          <div><h2 className="font-extrabold text-navy">{editing ? 'Edit channel' : 'Add channel'}</h2><p className="text-sm text-slate-500">Only enter a channel confirmed as official.</p></div>
          <Field label="Channel owner" name="channel-owner" required>{(props) => <select {...props} className="admin-input" value={form.ownerType} onChange={(e) => setForm({ ...form, ownerType: e.target.value, serviceId: '', mdaId: '' })} required><option value="service">Service</option><option value="mda">MDA-wide channel</option></select>}</Field>
          {form.ownerType === 'service' ? <Field label="Service" name="channel-service" required>{(props) => <select {...props} className="admin-input" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required><option value="">Select a service</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field> : <Field label="MDA" name="channel-mda" required>{(props) => <select {...props} className="admin-input" value={form.mdaId} onChange={(e) => setForm({ ...form, mdaId: e.target.value })} required><option value="">Select an MDA</option>{mdas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>}
          <Field label="Channel type" name="channel-type" required>{(props) => <select {...props} className="admin-input" value={form.channelType} onChange={(e) => setForm({ ...form, channelType: e.target.value })}>{['website', 'portal', 'office', 'email', 'phone', 'other'].map((item) => <option key={item} value={item}>{item}</option>)}</select>}</Field>
          <Field label="Label / title" name="channel-name" required>{(props) => <input {...props} className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}</Field>
          <Field label="Official URL" name="channel-url">{(props) => <input {...props} type="url" className="admin-input" value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} />}</Field>
          <Field label="Contact value" name="channel-contact">{(props) => <input {...props} className="admin-input" value={form.contactValue || ''} onChange={(e) => setForm({ ...form, contactValue: e.target.value })} />}</Field>
          <Field label="Instructions" name="channel-instructions">{(props) => <textarea {...props} className="admin-input min-h-24" value={form.instructions || ''} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />}</Field>
          <Field label="State" name="channel-active">{(props) => <select {...props} className="admin-input" value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Inactive</option></select>}</Field>
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="primary-button">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editing ? 'Save changes' : 'Add channel'}</button>{editing && <button type="button" onClick={reset} className="secondary-button">Cancel</button>}</div>
        </form>
      </div>
    </div>
  );
}
