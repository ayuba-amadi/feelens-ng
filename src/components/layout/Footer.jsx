import { Link } from 'react-router'

function Footer() {
  return (
    <footer id="about" className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div><Link to="/" className="text-lg font-bold tracking-tight text-slate-950">FeeLens <span className="text-emerald-600">NG</span></Link><p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">Independent civic-tech transparency project.</p><p className="mt-5 text-sm font-medium text-slate-800">Abuja, Nigeria</p></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Explore</p><div className="mt-4 flex flex-col gap-3 text-sm text-slate-600"><Link to="/about" className="hover:text-emerald-700">About</Link><Link to="/methodology" className="hover:text-emerald-700">Methodology</Link><Link to="/data-sources" className="hover:text-emerald-700">Data Sources</Link></div></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Project</p><div className="mt-4 flex flex-col gap-3 text-sm text-slate-600"><Link to="/privacy" className="hover:text-emerald-700">Privacy</Link><span className="text-slate-400" aria-disabled="true">GitHub</span></div></div>
      </div>
      <div className="border-t border-slate-100 px-5 py-5 sm:px-8 lg:px-10"><p className="mx-auto max-w-7xl text-xs leading-5 text-slate-500">FeeLens does not collect government payments and does not replace official government portals.</p></div>
    </footer>
  )
}

export default Footer
