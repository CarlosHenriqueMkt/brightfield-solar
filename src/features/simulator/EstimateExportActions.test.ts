// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

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
