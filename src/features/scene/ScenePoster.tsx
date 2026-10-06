import { getImageProps } from 'next/image';

export function ScenePoster({ className }: { className?: string }) {
  const common = {
    alt: 'Illustrative Phoenix home; roof fit needs an assessment',
    sizes: '100vw',
    loading: 'eager' as const,
    fetchPriority: 'high' as const,
    className,
  };
  const desktop = getImageProps({
    ...common,
    src: '/assets/posters/house-desktop.png',
    width: 1440,
    height: 820,
  }).props;
  const mobile = getImageProps({
    ...common,
    src: '/assets/posters/house-mobile.png',
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
