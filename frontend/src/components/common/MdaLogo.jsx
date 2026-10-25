import { useEffect, useState } from 'react';
import { Monogram } from './Monogram';

export function MdaLogo({ name, acronym, slug, size = 'normal' }) {
  const logoSources = slug ? [
    `/mda-logos/${encodeURIComponent(slug)}.svg`,
    `/mda-logos/${encodeURIComponent(slug)}.png`
  ] : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const logoSrc = logoSources[sourceIndex];
  const darkSurface = slug === 'ministry-interior-marriage-registry';

  useEffect(() => {
    setSourceIndex(0);
    setImageLoaded(false);
  }, [slug]);

  if (!logoSrc) return <Monogram name={name} acronym={acronym} size={size} />;

  return <img
    className={`mda-logo mda-logo-${size === 'large' ? 'large' : 'normal'}${darkSurface ? ' mda-logo-dark' : ''}${imageLoaded ? '' : ' invisible'}`}
    src={logoSrc}
    alt={`${name || 'MDA'} official logo`}
    onLoad={() => setImageLoaded(true)}
    onError={() => {
      setImageLoaded(false);
      setSourceIndex((current) => current + 1);
    }}
  />;
}
