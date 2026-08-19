import { Check, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import ServiceCard from '../common/ServiceCard'
import { agencies } from '../../data/agencies'
import { filterChips } from '../../data/filterChips'
import { services } from '../../data/services'

const agencyNames = new Map(agencies.map((agency) => [agency.id, agency.name]))
const searchServices = services.map((service) => ({
  ...service,
  agency: agencyNames.get(service.agencyId) ?? service.agencyId,
  category: service.category,
  scope: service.jurisdiction === 'fct' ? 'FCT' : 'Federal',
  tags: service.keywords,
}))

function HeroSearch() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [selectedService, setSelectedService] = useState(null)
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return searchServices.filter((service) => {
      const matchesQuery = !normalizedQuery || [service.name, service.agency, service.category, ...service.tags].join(' ').toLowerCase().includes(normalizedQuery)
      const matchesFilter = !activeFilter || service.scope === activeFilter || service.category === activeFilter || service.tags.includes(activeFilter.toLowerCase())
      return matchesQuery && matchesFilter
    })
  }, [activeFilter, query])
  const showResults = query.trim().length > 0 || activeFilter

  return (
    <div id="verify" className="mx-auto mt-10 max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5 sm:p-3">
        <label htmlFor="service-search" className="sr-only">Search government services</label>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3.5 ring-1 ring-inset ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-500">
          <Search size={21} className="shrink-0 text-emerald-600" aria-hidden="true" />
          <input id="service-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedService(null) }} placeholder="Search passport, NIN, CAC registration, driver's licence..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base" role="combobox" aria-expanded={Boolean(showResults)} aria-controls="search-results" aria-autocomplete="list" />
          <span className="hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-400 sm:inline">⌘ K</span>
        </div>
        <div className="scrollbar-hide flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain px-2 pb-1 pt-3 sm:flex-wrap sm:overflow-visible"><SlidersHorizontal size={15} className="shrink-0 text-slate-400" aria-hidden="true" />{filterChips.map((chip) => <button key={chip} type="button" onClick={() => setActiveFilter(activeFilter === chip ? '' : chip)} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${activeFilter === chip ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`} aria-pressed={activeFilter === chip}>{chip}</button>)}</div>
      </div>
      {showResults && <div id="search-results" role="listbox" aria-label="Matching production services" className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl shadow-slate-900/10"><div className="flex items-center justify-between px-3 py-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Production service matches</p><span className="text-xs text-slate-400">{results.length} found</span></div>{results.length > 0 ? results.slice(0, 4).map((service) => <div key={service.id} role="option" aria-selected={selectedService?.id === service.id}><ServiceCard service={service} onSelect={setSelectedService} /></div>) : <p className="px-3 py-5 text-sm text-slate-500">No production records match that search yet. Try another service or filter.</p>}<p className="px-3 py-2 text-xs leading-5 text-slate-400">Verified badges indicate evidence-linked records; conflicting records are not current verified fees.</p></div>}
      {selectedService && <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-900"><Check size={17} className="shrink-0 text-emerald-600" /><span>Selected <strong>{selectedService.name}</strong>. Verified source details will appear here in a future milestone.</span><ChevronRight size={16} className="ml-auto shrink-0 text-emerald-600" /></div>}
    </div>
  )
}

export default HeroSearch
