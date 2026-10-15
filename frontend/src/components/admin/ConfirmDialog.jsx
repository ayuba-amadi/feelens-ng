import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-navy/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 id="confirm-title" className="font-extrabold text-navy">{title}</h2><p id="confirm-message" className="mt-1 text-sm leading-6 text-slate-600">{message}</p></div><button type="button" onClick={onCancel} className="admin-icon-button" aria-label="Close confirmation"><X className="h-4 w-4" /></button></div>
        <div className="mt-5 flex justify-end gap-2"><button ref={cancelRef} type="button" onClick={onCancel} className="secondary-button">Cancel</button><button type="button" onClick={onConfirm} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">{confirmLabel}</button></div>
      </section>
    </div>
  );
}
