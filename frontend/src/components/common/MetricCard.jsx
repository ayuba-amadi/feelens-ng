export function MetricCard({ label, value, detail }) {
  return <div className="rounded-xl border border-slate-200/90 bg-white/90 p-4"><p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}</div>;
}

