'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from './Button';
import styles from './SpecialistCTA.module.css';

const specialistCopy =
  'This is where we’d connect you with a solar specialist. It’s a demo, so you get the sunshine without the sales call. No request has been sent. 😄';

export type SpecialistCTAProps = {
  className?: string;
  triggerClassName?: string;
};

export function SpecialistCTA({
  className = '',
  triggerClassName = styles.trigger,
}: SpecialistCTAProps) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const titleId = `${popoverId}-title`;
  const [open, setOpen] = useState(false);

  const updatePosition = useCallback(() => {
    const triggerElement = trigger.current;
    const popoverElement = popover.current;
    if (!triggerElement || !popoverElement) return;

    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
    const topEdge = (viewport?.offsetTop ?? 0) + 8;
    const rightEdge = leftEdge + viewportWidth - 16;
    const bottomEdge = topEdge + viewportHeight - 16;
    const bounds = triggerElement.getBoundingClientRect();
    if (bounds.bottom < topEdge || bounds.top > bottomEdge) {
      setOpen(false);
      return;
    }

    const width = Math.max(0, Math.min(320, viewportWidth - 16));
    popoverElement.style.width = `${width}px`;
    popoverElement.style.maxHeight = `${Math.max(0, Math.min(320, viewportHeight - 16))}px`;
    const height = popoverElement.offsetHeight;
    const below = bounds.bottom + 8;
    const above = bounds.top - height - 8;
    const top =
      below + height <= bottomEdge
        ? Math.max(topEdge, below)
        : Math.max(topEdge, Math.min(above, bottomEdge - height));
    popoverElement.style.left = `${Math.min(Math.max(leftEdge, bounds.left), rightEdge - width)}px`;
    popoverElement.style.top = `${top}px`;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = popover.current;
    panel?.showPopover();
    updatePosition();
    return () => {
      if (panel?.isConnected) panel.hidePopover();
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.current?.contains(target)) return;
      setOpen(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };

    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('keydown', dismissEscape, true);
    document.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('keydown', dismissEscape, true);
      document.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open, updatePosition]);

  const panel = open ? (
    <div
      ref={popover}
      id={popoverId}
      className={styles.popover}
      popover="manual"
      role="note"
      aria-label="Demo specialist explanation"
      tabIndex={0}
    >
      <p id={titleId} className={styles.copy}>
        {specialistCopy}
      </p>
    </div>
  ) : null;

  return (
    <div ref={root} className={`${styles.root} ${className}`}>
      <Button
        ref={trigger}
        variant="light"
        arrow={false}
        className={triggerClassName}
        aria-controls={popoverId}
        aria-expanded={open}
        aria-describedby={open ? titleId : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        Talk to a solar specialist
      </Button>
      {panel}
    </div>
  );
}
