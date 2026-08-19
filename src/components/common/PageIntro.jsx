function PageIntro({ eyebrow, title, description }) {
  return <section className="border-b border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p><h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{title}</h1>{description && <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{description}</p>}</div></section>
}

export default PageIntro
