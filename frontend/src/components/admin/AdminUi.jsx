import { AlertCircle, ArrowLeft, LoaderCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminPageHeader({ title, description, action, backTo }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backTo && <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-leaf hover:text-leaf-dark"><ArrowLeft className="h-4 w-4" /> Back</Link>}
        <h1 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {action && <Link to={action.to} className="primary-button shrink-0"><Plus className="h-4 w-4" /> {action.label}</Link>}
    </div>
  );
}

export function AdminLoading({ label = 'Loading records…' }) {
  return <div className="admin-state" aria-live="polite"><LoaderCircle className="h-5 w-5 animate-spin text-leaf" /><span>{label}</span></div>;
}

export function AdminError({ message, onRetry }) {
  return (
    <div className="admin-state border-red-200 bg-red-50 text-red-900" role="alert">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <span className="flex-1">{message || 'The request could not be completed.'}</span>
      {onRetry && <button type="button" onClick={onRetry} className="secondary-button">Try again</button>}
    </div>
  );
}

export function AdminEmpty({ title = 'No records yet', message, action }) {
  return (
    <div className="admin-state flex-col items-start py-8">
      <p className="font-extrabold text-navy">{title}</p>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      {action && <Link to={action.to} className="primary-button mt-2"><Plus className="h-4 w-4" /> {action.label}</Link>}
    </div>
  );
}

export function Field({ label, name, error, required, hint, children }) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="min-w-0">
      <label htmlFor={name} className="mb-1.5 block text-sm font-bold text-slate-800">{label}{required && <span className="text-red-700"> *</span>}</label>
      {typeof children === 'function' ? children({ id: name, 'aria-invalid': Boolean(error), 'aria-describedby': errorId || hintId }) : children}
      {hint && !error && <p id={hintId} className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}

export function FormSection({ title, description, children }) {
  return (
    <fieldset className="admin-panel p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 border-b border-slate-200 pb-3">
        <h2 className="font-extrabold text-navy">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function InlineNotice({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
