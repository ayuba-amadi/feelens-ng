import { ExternalLink } from 'lucide-react'

const labels = { application: 'Apply on official portal', payment: 'View official payment instructions', information: 'Read official service information', complaint: 'Use official complaint channel', physical_office: 'Find the official physical office' }

function OfficialChannels({ channels }) {
  return <section><h2 className="text-2xl font-bold tracking-tight text-slate-950">Continue through the official channel</h2><div className="mt-5 grid gap-3">{channels.length > 0 ? channels.map((channel) => <a key={`${channel.type}-${channel.url}`} href={channel.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><span><span className="block font-bold text-slate-900">{channel.label || labels[channel.type]}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{channel.description || labels[channel.type]}</span></span><ExternalLink size={17} className="mt-1 shrink-0 text-emerald-600" /></a>) : <p className="mt-4 text-sm leading-6 text-slate-600">An official channel has not yet been added to FeeLens.</p>}</div><p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">FeeLens does not collect government payments.</p></section>
}

export default OfficialChannels
