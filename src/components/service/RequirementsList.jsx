function RequirementsList({ requirements }) {
  return <section><h2 className="text-2xl font-bold tracking-tight text-slate-950">What you may need</h2>{requirements.length > 0 ? <ul className="mt-5 space-y-3">{requirements.map((requirement) => <li key={requirement.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><span className="font-semibold">{requirement.text}</span>{requirement.mandatory && <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Mandatory</span>}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-slate-600">Verified requirements have not yet been added to FeeLens.</p>}</section>
}

export default RequirementsList
