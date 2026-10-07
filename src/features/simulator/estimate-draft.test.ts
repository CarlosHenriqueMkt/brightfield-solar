import { describe, expect, it } from 'vitest';

import { phoenix } from '@/domain/cities/phoenix';
import { createEstimateDraft, updateEstimateDraft } from './estimate-draft';
import { createEstimateSnapshot } from './estimate-document';
import { EstimatePdfSession } from './estimate-export';

describe('estimate draft navigation', () => {
  it('keeps edits and backward navigation instant while an older PDF is pending', async () => {
    let complete!: (file: File) => void;
    const session = new EstimatePdfSession(
      () =>
        new Promise<File>((resolve) => {
          complete = resolve;
        }),
    );
    let state = createEstimateDraft(phoenix);
    state = updateEstimateDraft(state, { type: 'preset', index: 0 }, phoenix);
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'coverage', value: '100' },
      phoenix,
    );
    state = updateEstimateDraft(
      state,
      { type: 'step', step: 'result' },
      phoenix,
    );
    session.update(createEstimateSnapshot(phoenix, 90, 100), '90/100');
    const pending = session.prepare();
    await Promise.resolve();
    state = updateEstimateDraft(state, { type: 'step', step: 'edit' }, phoenix);
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'bill', value: '60' },
      phoenix,
    );
    const edited = createEstimateSnapshot(
      phoenix,
      state.accepted.bill,
      state.accepted.coverage,
    );
    expect(edited.result).toEqual({
      panelCount: '8 panels',
      investment: '$6,930.00',
      monthlySavings: '$60.00',
      payback: '9.6 years',
    });
    session.update(edited, '60/100');
    state = updateEstimateDraft(
      state,
      { type: 'step', step: 'result' },
      phoenix,
    );
    state = updateEstimateDraft(state, { type: 'step', step: 'bill' }, phoenix);
    expect(state.values).toEqual({ bill: '60', coverage: '100' });
    expect(state.accepted).toEqual({ bill: 60, coverage: 100 });
    complete(
      new File(['%PDF-1.7'], 'obsolete.pdf', { type: 'application/pdf' }),
    );
    expect(await pending).toBeNull();
    expect(session.fileFor('60/100')).toBeNull();
    session.dispose();
  });

  it('returns to presets without changing the current bill, coverage or accepted estimate', () => {
    let state = createEstimateDraft(phoenix);
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'coverage', value: '100' },
      phoenix,
    );
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'bill', value: '60' },
      phoenix,
    );
    state = updateEstimateDraft(
      state,
      { type: 'step', step: 'result' },
      phoenix,
    );
    const result = state;
    state = updateEstimateDraft(state, { type: 'step', step: 'bill' }, phoenix);
    expect(state.step).toBe('bill');
    expect(state.values).toEqual({ bill: '60', coverage: '100' });
    expect(state.accepted).toBe(result.accepted);
    expect(state.selectedProfile).toBeNull();
  });

  it('changes only the bill when selecting a preset and still permits manual editing', () => {
    let state = createEstimateDraft(phoenix);
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'coverage', value: '100' },
      phoenix,
    );
    state = updateEstimateDraft(state, { type: 'preset', index: 0 }, phoenix);
    expect(state.values).toEqual({ bill: '90', coverage: '100' });
    expect(state.accepted).toEqual({ bill: 90, coverage: 100 });
    expect(state.selectedProfile).toBe(0);
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'bill', value: '60' },
      phoenix,
    );
    expect(state.values).toEqual({ bill: '60', coverage: '100' });
    expect(state.selectedProfile).toBeNull();
  });

  it('retains invalid manual text and the last valid calculation until both fields are valid', () => {
    let state = createEstimateDraft(phoenix);
    const accepted = state.accepted;
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'coverage', value: '' },
      phoenix,
    );
    state = updateEstimateDraft(state, { type: 'preset', index: 0 }, phoenix);
    expect(state.values).toEqual({ bill: '90', coverage: '' });
    expect(state.accepted).toBe(accepted);
    expect(
      updateEstimateDraft(state, { type: 'step', step: 'result' }, phoenix),
    ).toBe(state);
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'coverage', value: '50' },
      phoenix,
    );
    expect(state.accepted).toEqual({ bill: 90, coverage: 50 });
  });

  it('preserves a preset selection when changing coverage and navigating backward', () => {
    let state = createEstimateDraft(phoenix);
    state = updateEstimateDraft(state, { type: 'preset', index: 0 }, phoenix);
    state = updateEstimateDraft(
      state,
      { type: 'step', step: 'coverage' },
      phoenix,
    );
    state = updateEstimateDraft(
      state,
      { type: 'field', field: 'coverage', value: '100' },
      phoenix,
    );
    state = updateEstimateDraft(state, { type: 'step', step: 'bill' }, phoenix);
    expect(state.selectedProfile).toBe(0);
    expect(state.values).toEqual({ bill: '90', coverage: '100' });
  });
});
