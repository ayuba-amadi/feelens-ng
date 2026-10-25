import { useState } from 'react';
import { Monogram } from './Monogram';

export function MdaLogo({ name, acronym, slug, size = 'normal' }) {
  const [imageAvailable, setImageAvailable] = useState(Boolean(slug));
  const logoSrc = slug ? `/mda-logos/${encodeURIComponent(slug)}.png` : null;

  if (!imageAvailable || !logoSrc) return <Monogram name={name} acronym={acronym} size={size} />;

  return <img
    className={`mda-logo mda-logo-${size === 'large' ? 'large' : 'normal'}`}
    src={logoSrc}
    alt={`${name || 'MDA'} official logo`}
    onError={() => setImageAvailable(false)}
  />;
}
