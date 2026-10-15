import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export function NotFoundPage() {
  return <div className="page-shell py-12 sm:py-16"><div className="surface-card mx-auto max-w-xl p-7 text-center"><SearchX className="mx-auto text-slate-400" size={28} aria-hidden="true" /><h1 className="mt-4 text-2xl font-black text-ink">That page is not available</h1><p className="mt-2 text-sm leading-6 text-slate-600">Try the MDA catalogue or return to the FeeLens home page.</p><Link className="primary-button mt-5" to="/">Go home</Link></div></div>;
}

