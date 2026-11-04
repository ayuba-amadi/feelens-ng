import { ArrowRight, FileCheck2, Landmark, Route } from 'lucide-react';
import { SectionHeading } from '../common/SectionHeading';

export function EvidenceFlow() {
  return <section><SectionHeading eyebrow="Evidence and sources" title="Evidence behind each record" description="FeeLens identifies missing or conflicting evidence." /><div className="surface-card mt-6 grid items-center gap-3 p-4 sm:grid-cols-3 sm:gap-0 sm:p-5">{[[Landmark, 'Official fee', 'What the available record says'], [FileCheck2, 'Authoritative evidence', 'The source, date, and status behind it'], [Route, 'Official service channel', 'Where to continue the transaction']].map(([Icon, title, description], index) => <div key={title} className="relative flex items-start gap-3 p-2 sm:block sm:text-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-leaf/10 text-leaf sm:mx-auto"><Icon size={21} aria-hidden="true" /></div><div className="min-w-0 sm:mt-3"><h3 className="font-bold text-ink">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{description}</p></div>{index < 2 ? <ArrowRight className="absolute -bottom-4 left-5 rotate-90 text-slate-300 sm:bottom-auto sm:left-auto sm:right-[-16px] sm:top-5 sm:rotate-0" size={22} aria-hidden="true" /> : null}</div>)}</div></section>;
}

