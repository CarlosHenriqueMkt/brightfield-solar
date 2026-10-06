import { describe, expect, it } from 'vitest';
import { moveCarouselIndex } from './testimonial-carousel-navigation';

describe('testimonial carousel navigation', () => {
  it('moves between valid neighboring slides without wrapping', () => {
    expect(moveCarouselIndex(0, 'next', 3)).toBe(1);
    expect(moveCarouselIndex(1, 'previous', 3)).toBe(0);
  });

  it('holds at both navigation boundaries', () => {
    expect(moveCarouselIndex(0, 'previous', 3)).toBe(0);
    expect(moveCarouselIndex(2, 'next', 3)).toBe(2);
  });
});
