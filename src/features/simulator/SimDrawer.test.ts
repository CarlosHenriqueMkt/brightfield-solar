import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { phoenix } from '@/domain/cities/phoenix';
import { createEstimateSnapshot } from './estimate-document';
import { SimDrawer } from './SimDrawer';
import type { SimDrawerProps } from './sim-drawer-types';

function props(overrides: Partial<SimDrawerProps> = {}): SimDrawerProps {
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
    onBillChange: () => {},
    onCoverageChange: () => {},
    onProfileSelect: () => {},
    onStepChange: () => {},
    onOpenChange: () => {},
    ...overrides,
  };
}

function render(overrides: Partial<SimDrawerProps> = {}) {
  return renderToStaticMarkup(createElement(SimDrawer, props(overrides)));
}

describe('simulator drawer accessibility contract', () => {
  it('exposes a labelled modal only while the mobile drawer is open', () => {
    const mobile = render({ modal: true });
    expect(mobile).toContain('role="dialog"');
    expect(mobile).toContain('aria-modal="true"');
    expect(mobile).toContain('aria-labelledby="estimate-title"');
    const desktop = render();
    expect(desktop).not.toContain('role="dialog"');
    expect(desktop).not.toContain('aria-modal="true"');
  });

  it('makes the retained closed drawer inert and removes modal semantics', () => {
    const closed = render({ modal: true, open: false, keepMounted: true });
    expect(closed).toContain('inert=""');
    expect(closed).toContain('aria-hidden="true"');
    expect(closed).not.toContain('role="dialog"');
    expect(closed).not.toContain('aria-modal="true"');
  });

  it('keeps an accessible close button with a decorative icon rather than an unnamed X', () => {
    const html = render();
    expect(html).toMatch(
      /<button[^>]*type="button"[^>]*aria-label="Close simulation"[^>]*>\s*<svg[^>]*aria-hidden="true"[^>]*focusable="false"/,
    );
  });

  it('keeps manually entered values in labelled native controls on the preset step', () => {
    const html = render({
      step: 'bill',
      selectedProfile: null,
      values: { bill: '60', coverage: '100' },
    });
    expect(html).toContain('for="estimate-bill"');
    expect(html).toMatch(/<input[^>]*id="estimate-bill"[^>]*value="60"/);
    expect(html).toContain('aria-label="Adjust monthly electricity bill"');
    expect(html).not.toContain('aria-pressed="true"');
  });
});
