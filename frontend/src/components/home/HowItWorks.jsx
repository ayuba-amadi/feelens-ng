import { ArrowRight, FileSearch, ListChecks, MousePointerClick } from 'lucide-react';
import { SectionHeading } from '../common/SectionHeading';

const steps = [
  { icon: MousePointerClick, number: '01', title: 'Find a service', description: 'Search by service, MDA name, or acronym.' },
  { icon: FileSearch, number: '02', title: 'Check fee and evidence', description: 'Read the fee option, status, source, and date checked.' },
  { icon: ListChecks, number: '03', title: 'Use the official channel', description: 'Continue through the official government route when one is listed.' }
];

export function HowItWorks() {
  return <section><SectionHeading eyebrow="How FeeLens works" title="A clearer path before you pay" description="FeeLens keeps the answer close to the evidence, and makes uncertainty visible." /><div className="surface-card mt-6 grid overflow-hidden md:grid-cols-3">{steps.map((step, index) => { const Icon = step.icon; return <div key={step.number} className="relative border-b border-slate-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="flex items-center justify-between"><span className="text-xs font-black tracking-[0.16em] text-leaf">{step.number}</span><Icon size={21} className="text-leaf" aria-hidden="true" /></div><h3 className="mt-5 font-bold text-ink">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>{index < steps.length - 1 ? <ArrowRight className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-white p-1 text-slate-400 md:block" size={22} aria-hidden="true" /> : null}</div>; })}</div></section>;
}

