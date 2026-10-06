import type { CityConfig } from '@/domain/cities/city-config';

export interface SolarEstimate {
  readonly consumptionKwh: number;
  readonly generationPerPanelKwh: number;
  readonly requiredPanels: number;
  readonly installedPanels: number;
  readonly grossCost: number;
  readonly netCost: number;
  readonly monthlySavings: number;
  readonly paybackYears: number;
  readonly minimumApplied: boolean;
  readonly savingsCapped: boolean;
  readonly excessCredit: boolean;
}

const BILL_MIN = 40;
const BILL_MAX = 600;
const BILL_STEP = 10;
const COVERAGE_MIN = 50;
const COVERAGE_MAX = 100;
const COVERAGE_STEP = 5;

function validateStepValue(
  value: number,
  name: 'bill' | 'coverage',
  minimum: number,
  maximum: number,
  step: number,
): void {
  if (
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    !Number.isInteger(value) ||
    value % step !== 0
  ) {
    throw new RangeError(
      `${name} must be a finite number from ${minimum} to ${maximum} in steps of ${step}.`,
    );
  }
}

export function validateSimulationInput(bill: number, coverage: number): void {
  validateStepValue(bill, 'bill', BILL_MIN, BILL_MAX, BILL_STEP);
  validateStepValue(
    coverage,
    'coverage',
    COVERAGE_MIN,
    COVERAGE_MAX,
    COVERAGE_STEP,
  );
}

function ceilWithFloatingPointTolerance(value: number): number {
  const nearestInteger = Math.round(value);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 8;
  return Math.abs(value - nearestInteger) <= tolerance
    ? nearestInteger
    : Math.ceil(value);
}

export function calculateSolarEstimate(
  city: CityConfig,
  bill: number,
  coverage: number,
): SolarEstimate {
  validateSimulationInput(bill, coverage);

  const consumptionKwh = bill / city.utilityRatePerKwh;
  const generationPerPanelKwh =
    (city.panelWatts / 1000) *
    city.peakSunHoursPerDay *
    30 *
    city.performanceRatio;
  const requiredPanels = ceilWithFloatingPointTolerance(
    (consumptionKwh * (coverage / 100)) / generationPerPanelKwh,
  );
  const installedPanels = Math.max(city.minPanels, requiredPanels);
  const grossCost =
    installedPanels * city.panelWatts * city.costPerWattInstalled;
  const netCost = grossCost * (1 - city.federalCreditRate);
  const rawSavings =
    installedPanels * generationPerPanelKwh * city.utilityRatePerKwh;
  const monthlySavings = Math.min(rawSavings, bill);

  return {
    consumptionKwh,
    generationPerPanelKwh,
    requiredPanels,
    installedPanels,
    grossCost,
    netCost,
    monthlySavings,
    paybackYears: netCost / (monthlySavings * 12),
    minimumApplied: requiredPanels < city.minPanels,
    savingsCapped: rawSavings >= bill,
    excessCredit: rawSavings > bill,
  };
}
