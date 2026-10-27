import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Field } from '../../components/admin/AdminUi';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function AdminLoginPage() {
  const { user, checking, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!checking && user) return <Navigate to="/admin" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await login(form);
      const destination = location.state?.from?.pathname;
      navigate(destination?.startsWith('/admin') && destination !== '/admin/login' ? destination : '/admin', { replace: true });
    } catch {
      setError('The email or password is incorrect.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-leaf text-xl font-black text-white">F</span>
          <p className="mt-3 text-xl font-black text-navy">FeeLens NG</p>
          <p className="text-sm font-semibold text-slate-500">Protected administration</p>
        </div>
        <form onSubmit={submit} className="admin-panel space-y-4 p-5 sm:p-7">
          <div>
            <h1 className="text-xl font-black text-navy">Administrator login</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">Use an account provisioned by an existing authorised administrator.</p>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</div>}
          <Field label="Email" name="admin-email" required>
            {(props) => <input {...props} type="email" autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="admin-input" required />}
          </Field>
          <Field label="Password" name="admin-password" required>
            {(props) => (
              <div className="relative">
                <input {...props} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="admin-input pr-12" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-1 grid w-10 place-items-center text-slate-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            )}
          </Field>
          <button type="submit" disabled={saving} className="primary-button w-full">
            {saving ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LockKeyhole aria-hidden="true" className="h-4 w-4" />}
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-xs leading-5 text-slate-500">No public registration is available. Citizen access to FeeLens does not require an account.</p>
        </form>
      </div>
    </main>
  );
}
