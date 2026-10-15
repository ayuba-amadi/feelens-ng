import { ArrowUpRight, Building2, Mail, MapPin, Phone } from 'lucide-react';
import { ExternalLink } from '../common/ExternalLink';
import { valueOf } from '../../lib/format';

const icons = { website: Building2, portal: Building2, office: MapPin, email: Mail, phone: Phone };

export function OfficialChannelCard({ channel }) {
  const type = String(valueOf(channel, 'channelType', 'channel_type', 'type') || 'website').toLowerCase();
  const Icon = icons[type] || ArrowUpRight;
  const url = valueOf(channel, 'url', 'officialUrl', 'official_url');
  return <article className="rounded-2xl border border-leaf/20 bg-[#f4f8f5] p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-leaf"><Icon size={18} aria-hidden="true" /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Official channel</p><h3 className="mt-1 break-words font-bold text-ink">{valueOf(channel, 'name', 'title') || 'Official service channel'}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{valueOf(channel, 'instructions', 'description') || 'Use this official channel to continue the government transaction.'}</p></div></div>{url ? <ExternalLink href={url} className="mt-3">Continue to official channel</ExternalLink> : <p className="mt-3 text-xs font-bold text-slate-500">A public link has not been supplied.</p>}</article>;
}

