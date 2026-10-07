import { getImageProps } from 'next/image';
import type { CityConfig } from '@/domain/cities/city-config';

export function ScenePoster({
  city,
  className,
}: {
  city: Pick<CityConfig, 'scenePoster'>;
  className?: string;
}) {
  const common = {
    alt: city.scenePoster.alt,
    sizes: '100vw',
    loading: 'eager' as const,
    fetchPriority: 'high' as const,
    className,
  };
  const desktop = getImageProps({
    ...common,
    src: city.scenePoster.desktopSrc,
    width: 1440,
    height: 820,
  }).props;
  const mobile = getImageProps({
    ...common,
    src: city.scenePoster.mobileSrc,
    width: 390,
    height: 780,
  }).props;
  return (
    <picture style={{ display: 'block' }}>
      <source
        media="(max-width: 700px)"
        srcSet={mobile.srcSet}
        sizes={mobile.sizes}
      />
      <img {...desktop} />
    </picture>
  );
}
