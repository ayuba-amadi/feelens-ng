import { useState } from 'react';
import { Monogram } from './Monogram';

const logos = import.meta.glob(['../../assets/mda-logos/*.webp', '../../assets/mda-logos/*.svg'], { eager: true, query: '?url', import: 'default' });
const bySlug = Object.fromEntries(Object.entries(logos).map(([path, url]) => [path.split('/').pop().replace(/\.(webp|svg)$/, ''), url]));

export function MdaLogo({ name, acronym, slug, size = 'normal' }) {
  const [failedSource, setFailedSource] = useState(null);
  const [loadedSource, setLoadedSource] = useState(null);
  const src = bySlug[slug];
  if (!src || failedSource === src) return <span role="img" aria-label={`${name || 'MDA'} logo unavailable`}><Monogram name={name} acronym={acronym} size={size} /></span>;
  const dimension = size === 'large' ? 56 : 44;
  return <span className="relative block shrink-0" style={{ width: dimension, height: dimension }}><span className="absolute inset-0"><Monogram name={name} acronym={acronym} size={size} /></span><img className={`mda-logo mda-logo-${size === 'large' ? 'large' : 'normal'}${slug === 'ministry-interior-marriage-registry' ? ' mda-logo-dark' : ''}`}
    style={{ position: 'relative', opacity: loadedSource === src ? 1 : 0 }} src={src} width={dimension} height={dimension} loading="lazy" decoding="async"
    alt={`${name || 'MDA'} official logo`} onLoad={() => setLoadedSource(src)} onError={() => setFailedSource(src)} /></span>;
}
