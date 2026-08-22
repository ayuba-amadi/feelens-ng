import { Link } from 'react-router'

function NotFoundPage() {
  return <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">404</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">That page is not in the directory.</h1><p className="mt-4 text-slate-600">The page may have moved, or the service or MDA slug may not exist.</p><div className="mt-8 flex justify-center gap-3"><Link to="/" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Return home</Link><Link to="/mdas" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Browse MDAs</Link></div></div>
}

export default NotFoundPage
