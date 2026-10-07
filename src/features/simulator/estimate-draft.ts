import type { CityConfig } from '@/domain/cities/city-config';
import { validateSimulationInput } from './finance';
import type { SimDrawerStep, SimDrawerValues } from './sim-drawer-types';

export interface EstimateDraft {
  readonly step: SimDrawerStep;
  readonly hasResult: boolean;
  readonly values: SimDrawerValues;
  readonly accepted: { readonly bill: number; readonly coverage: number };
  readonly selectedProfile: number | null;
}

export type EstimateDraftAction =
  | {
      readonly type: 'field';
      readonly field: keyof SimDrawerValues;
      readonly value: string;
    }
  | { readonly type: 'preset'; readonly index: number }
  | { readonly type: 'step'; readonly step: SimDrawerStep };

export function createEstimateDraft(city: CityConfig): EstimateDraft {
  const index = city.householdProfiles.findIndex(
    (profile) => profile.typicalBill === 220,
  );
  return {
    step: 'bill',
    hasResult: false,
    values: { bill: '220', coverage: '80' },
    accepted: { bill: 220, coverage: 80 },
    selectedProfile: index < 0 ? null : index,
  };
}

function acceptedValues(
  values: SimDrawerValues,
): EstimateDraft['accepted'] | null {
  if (!values.bill.trim() || !values.coverage.trim()) return null;
  const accepted = {
    bill: Number(values.bill),
    coverage: Number(values.coverage),
  };
  try {
    validateSimulationInput(accepted.bill, accepted.coverage);
    return accepted;
  } catch {
    return null;
  }
}

function updateField(
  state: EstimateDraft,
  field: keyof SimDrawerValues,
  value: string,
): EstimateDraft {
  const values = { ...state.values, [field]: value };
  return {
    ...state,
    values,
    accepted: acceptedValues(values) ?? state.accepted,
    selectedProfile: field === 'bill' ? null : state.selectedProfile,
  };
}

export function updateEstimateDraft(
  state: EstimateDraft,
  action: EstimateDraftAction,
  city: CityConfig,
): EstimateDraft {
  switch (action.type) {
    case 'field':
      return updateField(state, action.field, action.value);
    case 'preset': {
      const profile = city.householdProfiles[action.index];
      if (!profile) throw new RangeError('Unknown household profile');
      return {
        ...updateField(state, 'bill', String(profile.typicalBill)),
        selectedProfile: action.index,
      };
    }
    case 'step':
      return acceptedValues(state.values)
        ? {
            ...state,
            step: action.step,
            hasResult: state.hasResult || action.step === 'result',
          }
        : state;
    default: {
      const exhaustive: never = action;
      throw new Error(`Unknown estimate action: ${exhaustive}`);
    }
  }
}
