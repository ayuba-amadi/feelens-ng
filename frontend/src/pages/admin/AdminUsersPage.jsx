import { LoaderCircle, Pencil, Save, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, Field, InlineNotice } from '../../components/admin/AdminUi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../lib/admin-api';
import { formatDate } from '../../lib/format';

export function AdminUsersPage() {
  const { user } = useAdminAuth();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ email: '', displayName: '', password: '', role: 'admin' });
  const [pendingToggle, setPendingToggle] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() {
    try { const data = await adminApi.users.list({ pageSize: 100 }); setItems(data.items || []); setError(''); }
    catch (requestError) { setError(requestError.message); setItems([]); }
  }
  useEffect(() => { load(); }, []);
  async function create(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try { await adminApi.users.create(form); setForm({ email: '', displayName: '', password: '', role: 'admin' }); setNotice('Administrator created securely.'); await load(); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  async function toggleAccount(item) {
    try {
      await adminApi.users.update(item.id, { isActive: !item.isActive, updatedAt: item.updatedAt });
      setNotice(`Administrator ${item.isActive ? 'deactivated' : 'activated'}.`); await load();
    } catch (requestError) { setError(requestError.message); } finally { setPendingToggle(null); }
  }
  async function saveName(item) {
    if (!editingName.trim()) return;
    try {
      await adminApi.users.update(item.id, { displayName: editingName.trim(), updatedAt: item.updatedAt });
      setNotice('Administrator display name updated.'); setEditingUser(null); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  return (
    <div>
      <AdminPageHeader title="Administrators" description="Manage explicitly authorised FeeLens management users. Password hashes are never returned by the API." />
      {error && <div className="mb-4"><AdminError message={error} /></div>}{notice && <div className="mb-4"><InlineNotice tone="success">{notice}</InlineNotice></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.7fr)]">
        <section>{items === null ? <AdminLoading /> : items.length === 0 ? <AdminEmpty title="No administrator records returned" /> : <div className="admin-panel divide-y divide-slate-200">{items.map((item) => <article key={item.id} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1">{editingUser === item.id ? <div className="flex max-w-md gap-2"><label htmlFor={`admin-name-${item.id}`} className="sr-only">Administrator display name</label><input id={`admin-name-${item.id}`} className="admin-input" value={editingName} onChange={(e) => setEditingName(e.target.value)} /><button type="button" onClick={() => saveName(item)} className="secondary-button"><Save className="h-4 w-4" /> Save</button></div> : <><p className="truncate text-sm font-extrabold text-navy">{item.displayName}</p><p className="truncate text-xs text-slate-500">{item.email} · {item.role} · Last login {formatDate(item.lastLoginAt)}</p></>}</div><div className="flex flex-wrap items-center gap-2"><span className="admin-status">{item.isActive ? 'Active' : 'Inactive'}</span><button type="button" onClick={() => { setEditingUser(item.id); setEditingName(item.displayName); }} className="secondary-button"><Pencil className="h-4 w-4" /> Name</button><button type="button" disabled={Number(item.id) === Number(user?.id)} onClick={() => item.isActive ? setPendingToggle(item) : toggleAccount(item)} className="secondary-button">{item.isActive ? 'Deactivate' : 'Activate'}</button></div></div></article>)}</div>}</section>
        <form onSubmit={create} className="admin-panel h-fit space-y-4 p-4 sm:p-5 xl:sticky xl:top-24">
          <div><h2 className="font-extrabold text-navy">Create administrator</h2><p className="text-sm text-slate-500">Share the password through a secure channel and require it to be changed.</p></div>
          <Field label="Display name" name="user-display-name" required>{(props) => <input {...props} className="admin-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />}</Field>
          <Field label="Email" name="user-email" required>{(props) => <input {...props} type="email" className="admin-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}</Field>
          <Field label="Temporary password" name="user-password" required hint="At least 12 characters with uppercase, lowercase and a number.">{(props) => <input {...props} type="password" autoComplete="new-password" className="admin-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength="12" required />}</Field>
          <button type="submit" disabled={saving} className="primary-button">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{saving ? 'Creating…' : 'Create administrator'}</button>
        </form>
      </div>
      <ConfirmDialog open={Boolean(pendingToggle)} title="Deactivate administrator?" message="The administrator will lose access immediately after their session is checked again. FeeLens will always retain at least one active administrator." confirmLabel="Deactivate" onCancel={() => setPendingToggle(null)} onConfirm={() => toggleAccount(pendingToggle)} />
    </div>
  );
}
