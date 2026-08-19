function ProcessSteps({ steps }) {
  return <section><h2 className="text-2xl font-bold tracking-tight text-slate-950">How the official process works</h2>{steps.length > 0 ? <ol className="mt-5 space-y-4">{steps.map((step) => <li key={step.step} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">{step.step}</span><div><h3 className="font-bold text-slate-900">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p></div></li>)}</ol> : <p className="mt-4 text-sm leading-6 text-slate-600">Verified process steps have not yet been added to FeeLens.</p>}</section>
}

export default ProcessSteps
