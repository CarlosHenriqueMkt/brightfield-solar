// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

import { getCityBySlug } from '@/domain/cities/cities';
import { phoenix } from '@/domain/cities/phoenix';
import {
  createEstimateSnapshot,
  type EstimateSnapshot,
} from './estimate-document';
import { generateEstimatePdf } from './estimate-pdf';
import EstimateExportActions from './EstimateExportActions';
import { SimDrawer } from './SimDrawer';

vi.mock('./estimate-pdf', () => ({ generateEstimatePdf: vi.fn() }));

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function registryCity(slug: string) {
  const city = getCityBySlug(slug);
  if (!city) throw new Error(`Missing registered test city: ${slug}`);
  return city;
}

afterEach(async () => {
  await act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy');
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('prepares again after inactive edits return to a previously ready identity', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperties(HTMLElement.prototype, {
    scrollTo: { configurable: true, value: vi.fn() },
    scrollBy: { configurable: true, value: vi.fn() },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const mountedRoot = root;
  const mountedContainer = container;
  const a = createEstimateSnapshot(phoenix, 90, 100);
  const b = createEstimateSnapshot(phoenix, 100, 100);
  const initialFile = new File(['%PDF-1.7'], 'initial-a.pdf', {
    type: 'application/pdf',
  });
  const matchingFile = new File(['%PDF-1.7'], 'regenerated-a.pdf', {
    type: 'application/pdf',
  });
  let resolveGeneration!: (file: File) => void;
  const pendingGeneration = new Promise<File>((resolve) => {
    resolveGeneration = resolve;
  });
  vi.mocked(generateEstimatePdf)
    .mockResolvedValueOnce(initialFile)
    .mockReturnValueOnce(pendingGeneration);

  async function render(snapshot: EstimateSnapshot, active: boolean) {
    const children = (actions: ReactNode, resultPreparing: boolean) =>
      createElement(SimDrawer, {
        id: 'estimate',
        open: active,
        keepMounted: true,
        step: active ? 'result' : 'edit',
        values: { bill: String(snapshot.bill), coverage: '100' },
        profiles: phoenix.householdProfiles,
        selectedProfile: null,
        result: snapshot.result,
        notices: snapshot.notices,
        stateIncentiveNote: snapshot.stateIncentiveNote,
        explanation: snapshot.explanation,
        installationHref: '#installation',
        exportActions: actions,
        resultPreparing,
        onBillChange: () => {},
        onCoverageChange: () => {},
        onProfileSelect: () => {},
        onStepChange: () => {},
        onOpenChange: () => {},
      });
    await act(() => {
      mountedRoot.render(
        createElement(EstimateExportActions, {
          snapshot,
          invalidationKey: `${snapshot.key}|${snapshot.bill}|100`,
          active,
          children,
        }),
      );
    });
  }

  await render(a, true);
  expect(
    mountedContainer.querySelector('[data-status="ready"]'),
  ).not.toBeNull();
  expect(mountedContainer.querySelector('dl')).not.toBeNull();

  await render(b, false);
  await render(a, false);
  await render(a, true);

  expect(mountedContainer.querySelector('dl')).toBeNull();
  expect(mountedContainer.querySelector('a[href="#installation"]')).toBeNull();
  expect(
    mountedContainer.querySelector('[role="status"]')?.textContent,
  ).toMatch(/Preparing your estimate/);
  expect(mountedContainer.querySelector('[data-status="ready"]')).toBeNull();
  expect(mountedContainer.textContent).not.toMatch(/PDF ready/i);

  await act(async () => {
    resolveGeneration(matchingFile);
    await pendingGeneration;
  });

  expect(mountedContainer.querySelector('dl')).not.toBeNull();
  expect(
    mountedContainer.querySelector('a[href="#installation"]'),
  ).not.toBeNull();
  expect(
    mountedContainer.querySelector('[data-status="ready"]'),
  ).not.toBeNull();
  expect(
    mountedContainer.querySelector('[role="status"]')?.textContent,
  ).toMatch(/PDF ready/i);
});

it('keeps the mounted destination through Phoenix, A, B, and Phoenix changes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperties(HTMLElement.prototype, {
    scrollTo: { configurable: true, value: vi.fn() },
    scrollBy: { configurable: true, value: vi.fn() },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const mountedRoot = root;
  const mountedContainer = container;
  const cityA = registryCity('city-a');
  const cityB = registryCity('city-b');
  const snapshots = [
    createEstimateSnapshot(phoenix, 90, 100),
    createEstimateSnapshot(cityA, 220, 80),
    createEstimateSnapshot(cityB, 90, 100),
    createEstimateSnapshot(phoenix, 90, 100),
  ];
  let resolveOldSuccess!: (file: File) => void;
  let rejectOldError!: (reason: Error) => void;
  let resolveCityB!: (file: File) => void;
  let resolveDestination!: (file: File) => void;
  const oldSuccess = new Promise<File>((resolve) => {
    resolveOldSuccess = resolve;
  });
  const oldError = new Promise<File>((_, reject) => {
    rejectOldError = reject;
  });
  const cityBWork = new Promise<File>((resolve) => {
    resolveCityB = resolve;
  });
  const destinationWork = new Promise<File>((resolve) => {
    resolveDestination = resolve;
  });
  vi.mocked(generateEstimatePdf)
    .mockReturnValueOnce(oldSuccess)
    .mockReturnValueOnce(oldError)
    .mockReturnValueOnce(cityBWork)
    .mockReturnValueOnce(destinationWork);

  async function render(snapshot: EstimateSnapshot) {
    const profiles =
      snapshot.citySlug === cityA.slug
        ? cityA.householdProfiles
        : snapshot.citySlug === cityB.slug
          ? cityB.householdProfiles
          : phoenix.householdProfiles;
    const children = (actions: ReactNode, resultPreparing: boolean) =>
      createElement(SimDrawer, {
        id: 'estimate',
        open: true,
        keepMounted: true,
        step: 'result',
        values: {
          bill: String(snapshot.bill),
          coverage: String(snapshot.coverage),
        },
        profiles,
        selectedProfile: null,
        result: snapshot.result,
        notices: snapshot.notices,
        stateIncentiveNote: snapshot.stateIncentiveNote,
        explanation: snapshot.explanation,
        installationHref: '#installation',
        exportActions: actions,
        resultPreparing,
        onBillChange: () => {},
        onCoverageChange: () => {},
        onProfileSelect: () => {},
        onStepChange: () => {},
        onOpenChange: () => {},
      });
    await act(async () => {
      mountedRoot.render(
        createElement(EstimateExportActions, {
          snapshot,
          invalidationKey: `${snapshot.key}|${snapshot.bill}|${snapshot.coverage}`,
          active: true,
          children,
        }),
      );
      await Promise.resolve();
    });
  }

  await render(snapshots[0]);
  await render(snapshots[1]);
  await render(snapshots[2]);
  await render(snapshots[3]);
  expect(mountedContainer.querySelector('[data-status="ready"]')).toBeNull();
  expect(mountedContainer.textContent).toMatch(/Preparing your estimate/);

  await act(async () => {
    resolveOldSuccess(
      new File(['obsolete'], 'old-success.pdf', {
        type: 'application/pdf',
      }),
    );
    rejectOldError(new Error('obsolete city error'));
    resolveCityB(
      new File(['obsolete'], 'old-city-b.pdf', {
        type: 'application/pdf',
      }),
    );
    await Promise.resolve();
  });
  expect(mountedContainer.querySelector('[data-status="ready"]')).toBeNull();
  expect(mountedContainer.textContent).toMatch(/Preparing your estimate/);

  const destinationFile = new File(['current'], 'phoenix-destination.pdf', {
    type: 'application/pdf',
  });
  await act(async () => {
    resolveDestination(destinationFile);
    await destinationWork;
  });
  expect(
    mountedContainer.querySelector('[data-status="ready"]'),
  ).not.toBeNull();
  expect(mountedContainer.textContent).toMatch(/9 panels/);
  expect(vi.mocked(generateEstimatePdf)).toHaveBeenCalledTimes(4);
});

it('holds native share ownership across an actual city-owner unmount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('isSecureContext', true);
  let finishOldShare!: () => void;
  const oldShare = new Promise<void>((resolve) => {
    finishOldShare = resolve;
  });
  const share = vi
    .fn()
    .mockReturnValueOnce(oldShare)
    .mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { canShare: () => true, share });
  vi.mocked(generateEstimatePdf).mockImplementation(
    async (snapshot) =>
      new File(['prepared'], `${snapshot.citySlug}.pdf`, {
        type: 'application/pdf',
      }),
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const mountedRoot = root;
  const mountedContainer = container;

  async function render(slug: string) {
    const snapshot = createEstimateSnapshot(registryCity(slug), 220, 80);
    await act(async () => {
      mountedRoot.render(
        createElement(EstimateExportActions, {
          key: slug,
          snapshot,
          invalidationKey: snapshot.key,
          active: true,
          children: (actions) => actions,
        }),
      );
    });
  }

  function shareButton() {
    return Array.from(mountedContainer.querySelectorAll('button')).find(
      (button) => button.textContent === 'Share estimate',
    )!;
  }

  try {
    await render('city-a');
    await act(() => shareButton().click());
    expect(share).toHaveBeenCalledTimes(1);
    await render('city-b');
    expect(shareButton().getAttribute('aria-disabled')).toBe('true');
    expect(mountedContainer.textContent).toMatch(
      /share request is still open/i,
    );
    await act(() => shareButton().click());
    expect(share).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishOldShare();
      await oldShare;
    });
    expect(shareButton().getAttribute('aria-disabled')).toBe('false');
    expect(mountedContainer.textContent).toMatch(/PDF ready/i);
    expect(mountedContainer.textContent).not.toMatch(/Estimate shared/);
    await act(() => shareButton().click());
    expect(share).toHaveBeenCalledTimes(2);
    expect(share.mock.calls[1][0].files[0].name).toBe('city-b.pdf');
  } finally {
    await act(async () => {
      finishOldShare();
      await oldShare;
    });
  }
});
