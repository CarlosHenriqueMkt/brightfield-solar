import type {
  SimDrawerValues,
  SimPresentationResult,
} from '@/features/simulator/sim-drawer-types';

export const presentationFixtures = {
  standard: {
    label: 'Approved result fixture — fictional, not calculated',
    values: { bill: '220', coverage: '80' },
    result: {
      panelCount: '17 panels',
      investment: '$14,726.25',
      monthlySavings: '$179.01',
      payback: '6.9 years',
    },
    notices: [],
  },
  minimum: {
    label: 'Boundary fixture — fictional, not calculated',
    values: { bill: '60', coverage: '100' },
    result: {
      panelCount: '8 panels',
      investment: '$6,930.00',
      monthlySavings: '$60.00',
      payback: '9.6 years',
    },
    notices: [
      'Your estimate uses the 8-panel minimum. That is why reducing your target may not reduce the system size.',
      'Estimated savings stops at your bill amount. Extra generation becomes utility credit in this model, not cash back.',
      'Estimated monthly savings is the reduction calculated by this model. It is not a loan payment.',
    ],
  },
} satisfies Record<
  'standard' | 'minimum',
  {
    label: string;
    values: SimDrawerValues;
    result: SimPresentationResult;
    notices: readonly string[];
  }
>;
