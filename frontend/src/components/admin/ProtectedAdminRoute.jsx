import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function ProtectedAdminRoute() {
  const { user, checking } = useAdminAuth();
  const location = useLocation();

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Checking administrator session…
        </div>
      </main>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return <Outlet />;
}
