import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

export function ExternalLink({ href, children, className = '', label }) {
  if (!href) return null;
  return <a className={`inline-flex min-h-11 items-center gap-2 text-sm font-bold text-leaf hover:text-leaf-dark ${className}`} href={href} target="_blank" rel="noreferrer" aria-label={label || undefined}>{children}{!label ? <span className="sr-only"> (opens in a new tab)</span> : null}<ExternalLinkIcon size={15} aria-hidden="true" /></a>;
}

