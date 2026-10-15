export function Monogram({ name, acronym, size = 'normal' }) {
  const letters = acronym || String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
  const sizing = size === 'large' ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm';
  return <div className={`flex shrink-0 items-center justify-center rounded-xl bg-ink font-black tracking-wide text-white ${sizing}`} aria-hidden="true">{letters.slice(0, 4)}</div>;
}

