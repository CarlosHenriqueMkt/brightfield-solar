'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  moveCarouselIndex,
  clampCarouselIndex,
} from './testimonial-carousel-navigation';
import styles from './TestimonialCarousel.module.css';

export type TestimonialCarouselSlide = {
  id: string;
  label: string;
  content: ReactNode;
};

type TestimonialCarouselProps = {
  slides: readonly TestimonialCarouselSlide[];
  ariaLabel: string;
};

export function TestimonialCarousel({
  slides,
  ariaLabel,
}: TestimonialCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const measuredWidth = useRef<number | null>(null);
  const initialIndex = slides.length > 1 ? 1 : 0;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const currentIndex = clampCarouselIndex(selectedIndex, slides.length);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    measuredWidth.current = null;
    const observer = new ResizeObserver(() => {
      if (measuredWidth.current === rail.clientWidth) return;
      measuredWidth.current = rail.clientWidth;
      const target = rail.querySelector<HTMLElement>('[aria-current="true"]');
      if (!target) return;
      rail.scrollTo({
        behavior: 'auto',
        left:
          target.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft),
      });
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [slides.length]);

  function updateSelectedFromScroll() {
    const rail = railRef.current;
    if (
      !rail ||
      slideRefs.current.length === 0 ||
      measuredWidth.current !== rail.clientWidth ||
      rail.scrollWidth <= rail.clientWidth + 1
    )
      return;

    const selected = slideRefs.current[currentIndex];
    if (!selected) return;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let nearestIndex = currentIndex;
    let nearestDistance = Math.abs(
      selected.offsetLeft + selected.offsetWidth / 2 - center,
    );
    for (let index = 0; index < slideRefs.current.length; index += 1) {
      const slide = slideRefs.current[index];
      if (!slide || index === currentIndex) continue;
      const distance = Math.abs(
        slide.offsetLeft + slide.offsetWidth / 2 - center,
      );
      // Rounded scroll/offset widths can differ by 2px for equally visible cards.
      if (distance < nearestDistance - 2) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    setSelectedIndex(nearestIndex);
  }

  function select(index: number) {
    const nextIndex = clampCarouselIndex(index, slides.length);
    const rail = railRef.current;
    const target = slideRefs.current[nextIndex];
    setSelectedIndex(nextIndex);
    if (!rail || !target) return;

    rail.scrollTo({
      behavior: 'auto',
      left: target.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft),
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (slides.length === 0) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(moveCarouselIndex(currentIndex, 'previous', slides.length));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(moveCarouselIndex(currentIndex, 'next', slides.length));
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      select(slides.length - 1);
    }
  }

  if (slides.length === 0) return null;

  return (
    <div className={styles.carousel}>
      <div className={styles.viewport}>
        <div
          ref={railRef}
          className={styles.rail}
          role="region"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onScroll={updateSelectedFromScroll}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              role="group"
              ref={(element) => {
                slideRefs.current[index] = element;
              }}
              className={styles.slide}
              aria-label={`${slide.label}, slide ${index + 1} of ${slides.length}`}
              aria-current={currentIndex === index ? 'true' : undefined}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          onClick={() =>
            select(moveCarouselIndex(currentIndex, 'previous', slides.length))
          }
          aria-label="Previous testimonial"
          disabled={currentIndex === 0}
        >
          <span aria-hidden="true">←</span>
        </button>
        <p className={styles.status} role="status" aria-live="polite">
          {currentIndex + 1} of {slides.length}
          <span className={styles.statusLabel}>
            {' '}
            · {slides[currentIndex]?.label}
          </span>
        </p>
        <button
          type="button"
          className={styles.control}
          onClick={() =>
            select(moveCarouselIndex(currentIndex, 'next', slides.length))
          }
          aria-label="Next testimonial"
          disabled={currentIndex === slides.length - 1}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
