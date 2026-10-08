// @vitest-environment jsdom

import { act, createElement, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { phoenix } from '@/domain/cities/phoenix';
import { createEstimateSnapshot } from '@/features/simulator/estimate-document';
import { SimDrawer } from '@/features/simulator/SimDrawer';
import type { SimDrawerProps } from '@/features/simulator/sim-drawer-types';
import { SpecialistCTA } from './SpecialistCTA';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function mount(node: ReactNode) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function specialistButton() {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent === 'Talk to a solar specialist',
  ) as HTMLButtonElement | undefined;
}

function specialistPopover() {
  const id = specialistButton()?.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}

function drawerProps(overrides: Partial<SimDrawerProps> = {}): SimDrawerProps {
  const snapshot = createEstimateSnapshot(phoenix, 90, 100);
  return {
    id: 'estimate',
    open: true,
    step: 'result',
    values: { bill: '90', coverage: '100' },
    profiles: phoenix.householdProfiles,
    selectedProfile: 0,
    result: snapshot.result,
    notices: snapshot.notices,
    stateIncentiveNote: snapshot.stateIncentiveNote,
    explanation: snapshot.explanation,
    installationHref: '#installation',
    onBillChange: vi.fn(),
    onCoverageChange: vi.fn(),
    onProfileSelect: vi.fn(),
    onStepChange: vi.fn(),
    onOpenChange: vi.fn(),
    ...overrides,
  };
}

function DrawerHarness({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return createElement(SimDrawer, {
    ...drawerProps({ open, keepMounted: true, modal: true }),
    onOpenChange: setOpen,
  });
}

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    showPopover: { configurable: true, value: vi.fn() },
    hidePopover: { configurable: true, value: vi.fn() },
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 16,
    y: 80,
    top: 80,
    right: 256,
    bottom: 132,
    left: 16,
    width: 240,
    height: 52,
    toJSON: () => ({}),
  });
});

afterEach(async () => {
  await act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
  Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SpecialistCTA', () => {
  it('toggles the anchored popover repeatedly and exposes its copy when open', () => {
    mount(createElement(SpecialistCTA));
    const button = specialistButton()!;

    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const popover = specialistPopover()!;
    expect(button.getAttribute('aria-controls')).toBe(popover.id);
    expect(button.getAttribute('aria-describedby')).toBe(
      popover.querySelector('p')?.id,
    );
    expect(popover.textContent).toContain(
      'This is where we’d connect you with a solar specialist. It’s a demo, so you get the sunshine without the sales call. No request has been sent. 😄',
    );

    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(specialistPopover()).toBeNull();

    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(specialistPopover()).not.toBeNull();
  });

  it('dismisses on outside pointerdown and Escape without stealing outside focus', () => {
    mount(createElement(SpecialistCTA));
    const button = specialistButton()!;
    const outside = document.createElement('button');
    outside.type = 'button';
    container!.append(outside);

    act(() => button.click());
    act(() => {
      outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      outside.focus();
    });
    expect(specialistPopover()).toBeNull();
    expect(document.activeElement).toBe(outside);

    act(() => button.click());
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(specialistPopover()).toBeNull();
    expect(document.activeElement).toBe(button);
    outside.remove();
  });

  it('gives an open specialist popover Escape priority over the retained modal', () => {
    mount(createElement(DrawerHarness));
    const button = specialistButton()!;
    const drawer = container!.querySelector('[data-sim-drawer-open]')!;

    act(() => button.click());
    act(() => {
      drawer.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(specialistPopover()).toBeNull();
    expect(drawer.getAttribute('data-sim-drawer-open')).toBe('true');

    act(() => {
      drawer.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(drawer.getAttribute('data-sim-drawer-open')).toBe('false');
  });

  it('cleans document listeners across unmount and city-style remount', () => {
    mount(createElement(SpecialistCTA));
    const oldButton = specialistButton()!;
    act(() => oldButton.click());
    expect(specialistPopover()).not.toBeNull();

    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
    expect(specialistPopover()).toBeNull();

    mount(createElement(SpecialistCTA));
    expect(specialistPopover()).toBeNull();
    expect(specialistButton()?.getAttribute('aria-expanded')).toBe('false');
  });

  it('only exposes the trigger for a released result and closes it when the retained drawer deactivates', () => {
    mount(createElement(SimDrawer, drawerProps({ resultPreparing: true })));
    expect(specialistButton()).toBeUndefined();

    act(() => root?.render(createElement(SimDrawer, drawerProps())));
    const button = specialistButton()!;
    act(() => button.click());
    expect(specialistPopover()).not.toBeNull();

    act(() =>
      root?.render(
        createElement(
          SimDrawer,
          drawerProps({ open: false, keepMounted: true }),
        ),
      ),
    );
    expect(specialistPopover()).toBeNull();
  });

  it('keeps its explanation in the modal subtree without advertising a second dialog', () => {
    mount(createElement(DrawerHarness));
    const button = specialistButton()!;
    act(() => button.click());
    const panel = document.getElementById(
      button.getAttribute('aria-controls')!,
    )!;
    expect(panel.closest('[data-sim-drawer-open]')).not.toBeNull();
    expect(panel.getAttribute('role')).toBe('note');
    expect(button.hasAttribute('aria-haspopup')).toBe(false);
    expect(document.activeElement).not.toBe(panel);
  });

  it('keeps the panel inside the actual short viewport rather than a minimum virtual height', () => {
    vi.stubGlobal('innerWidth', 200);
    vi.stubGlobal('innerHeight', 160);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(112);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(184);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 8,
      y: 72,
      top: 72,
      right: 168,
      bottom: 116,
      left: 8,
      width: 160,
      height: 44,
      toJSON: () => ({}),
    });
    mount(createElement(SpecialistCTA));
    act(() => specialistButton()!.click());
    const panel = specialistPopover()!;
    expect(Number.parseFloat(panel.style.top) + 112).toBeLessThanOrEqual(152);
    expect(Number.parseFloat(panel.style.left) + 184).toBeLessThanOrEqual(192);
  });
});
