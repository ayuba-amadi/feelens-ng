import { KeyRound, LoaderCircle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminError, AdminLoading, AdminPageHeader, Field, FormSection, InlineNotice } from '../../components/admin/AdminUi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../lib/admin-api';

export function AdminAccountPage() {
  const { setUser } = useAdminAuth();
  const [account, setAccount] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState('');
  useEffect(() => { adminApi.account().then(setAccount).catch((requestError) => setError(requestError.message)); }, []);
  async function saveProfile(event) {
    event.preventDefault(); setSaving('profile'); setError(''); setNotice('');
    try { const updated = await adminApi.updateAccount({ displayName: account.displayName }); setAccount({ ...account, ...updated }); setUser((current) => ({ ...current, displayName: updated.displayName })); setNotice('Account profile updated.'); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(''); }
  }
  async function changePassword(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (passwords.newPassword !== passwords.confirmation) { setError('New password and confirmation do not match.'); return; }
    setSaving('password');
    try { await adminApi.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }); setPasswords({ currentPassword: '', newPassword: '', confirmation: '' }); setNotice('Password changed. Other administrator sessions for this account were invalidated.'); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(''); }
  }
  if (!account && !error) return <AdminLoading label="Loading account…" />;
  return (
    <div>
      <AdminPageHeader title="My account" description="Update your profile and credentials. Email and role changes are managed from administrator management." />
      {error && <div className="mb-4"><AdminError message={error} /></div>}{notice && <div className="mb-4"><InlineNotice tone="success">{notice}</InlineNotice></div>}
      {account && <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveProfile}><FormSection title="Profile"><div className="space-y-4"><Field label="Email" name="account-email"><input id="account-email" className="admin-input bg-slate-100" value={account.email} disabled /></Field><Field label="Role" name="account-role"><input id="account-role" className="admin-input bg-slate-100 capitalize" value={account.role} disabled /></Field><Field label="Display name" name="account-display" required>{(props) => <input {...props} className="admin-input" value={account.displayName} onChange={(e) => setAccount({ ...account, displayName: e.target.value })} required />}</Field><button type="submit" disabled={Boolean(saving)} className="primary-button">{saving === 'profile' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile</button></div></FormSection></form>
        <form onSubmit={changePassword}><FormSection title="Change password" description="Changing your password rotates this session and invalidates your other sessions."><div className="space-y-4"><Field label="Current password" name="current-password" required>{(props) => <input {...props} type="password" autoComplete="current-password" className="admin-input" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />}</Field><Field label="New password" name="new-password" required hint="At least 12 characters with uppercase, lowercase and a number.">{(props) => <input {...props} type="password" autoComplete="new-password" minLength="12" className="admin-input" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />}</Field><Field label="Confirm new password" name="confirm-password" required>{(props) => <input {...props} type="password" autoComplete="new-password" minLength="12" className="admin-input" value={passwords.confirmation} onChange={(e) => setPasswords({ ...passwords, confirmation: e.target.value })} required />}</Field><button type="submit" disabled={Boolean(saving)} className="primary-button">{saving === 'password' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Change password</button></div></FormSection></form>
      </div>}
    </div>
  );
}
