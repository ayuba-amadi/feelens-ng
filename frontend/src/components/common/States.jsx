import { AlertTriangle, Database, LoaderCircle, SearchX } from 'lucide-react';

export function LoadingState({ label = 'Loading public information…' }) {
  return <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600" role="status"><LoaderCircle size={18} className="mr-2 animate-spin text-leaf" aria-hidden="true" />{label}</div>;
}

export function EmptyState({ title = 'No records yet', description = 'There is no public information to show here yet.', icon: Icon = Database }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"><Icon size={24} className="mx-auto text-slate-400" aria-hidden="true" /><h3 className="mt-3 font-bold text-ink">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p></div>;
}

export function ErrorState({ title = 'Public data is unavailable', description = 'The service could not be reached. Please try again later.', onRetry }) {
  return <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-6 text-center"><AlertTriangle size={24} className="mx-auto text-orange-700" aria-hidden="true" /><h3 className="mt-3 font-bold text-ink">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>{onRetry ? <button type="button" className="secondary-button mt-4" onClick={onRetry}>Try again</button> : null}</div>;
}

export function SearchEmptyState() { return <EmptyState icon={SearchX} title="No matching records" description="Try a service name, MDA name, or acronym. FeeLens does not fill gaps with guesses." />; }

