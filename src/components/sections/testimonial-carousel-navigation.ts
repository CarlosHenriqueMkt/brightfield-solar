export type CarouselDirection = 'previous' | 'next';

export function clampCarouselIndex(index: number, count: number) {
  if (count === 0) return 0;
  return Math.max(0, Math.min(index, count - 1));
}

export function moveCarouselIndex(
  index: number,
  direction: CarouselDirection,
  count: number,
) {
  const current = clampCarouselIndex(index, count);
  if (direction === 'previous') return Math.max(0, current - 1);
  return Math.min(Math.max(0, count - 1), current + 1);
}
