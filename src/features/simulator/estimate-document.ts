import {
  getCityDisplayName,
  type CityConfig,
} from '@/domain/cities/city-config';
import { calculateSolarEstimate, type SolarEstimate } from './finance';
import type { SimPresentationResult } from './sim-drawer-types';

export interface EstimateSnapshot {
  readonly key: string;
  readonly citySlug: string;
  readonly cityLabel: string;
  readonly designationNotice: string | null;
  readonly bill: number;
  readonly coverage: number;
  readonly estimate: Readonly<SolarEstimate>;
  readonly result: SimPresentationResult;
  readonly notices: readonly string[];
  readonly stateIncentiveNote: string;
  readonly explanation: string;
  readonly disclaimer: string;
}

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const years = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function createEstimateSnapshot(
  city: CityConfig,
  bill: number,
  coverage: number,
): EstimateSnapshot {
  const estimate = Object.freeze(calculateSolarEstimate(city, bill, coverage));
  const result: SimPresentationResult = Object.freeze({
    panelCount: `${estimate.installedPanels} panels`,
    investment: dollars.format(estimate.netCost),
    monthlySavings: dollars.format(estimate.monthlySavings),
    payback: `${years.format(estimate.paybackYears)} years`,
  });
  const notices: string[] = [];
  if (estimate.minimumApplied) {
    notices.push(`The minimum system size is ${city.minPanels} panels`);
  }
  if (estimate.savingsCapped) {
    notices.push(
      'Estimated savings stop at the size of your electricity bill.',
    );
  }
  if (estimate.excessCredit) {
    notices.push(
      `Energy generated beyond your usage becomes credit with ${city.utilityName}, not cash back.`,
    );
  }
  if (estimate.installedPanels > 51) {
    notices.push(
      `Your estimate includes ${estimate.installedPanels} panels. This illustrative roof displays up to 51; the financial calculation includes every panel.`,
    );
  }

  const designationNotice =
    city.designation.kind === 'demo' ? city.designation.notice : null;

  return Object.freeze({
    key: JSON.stringify([
      city.slug,
      city.city,
      city.state,
      city.stateFull,
      city.designation.kind,
      city.designation.kind === 'demo' ? city.designation.label : null,
      designationNotice,
      city.utilityName,
      city.utilityRatePerKwh,
      city.peakSunHoursPerDay,
      city.panelWatts,
      city.performanceRatio,
      city.costPerWattInstalled,
      city.minPanels,
      city.federalCreditRate,
      city.stateIncentiveNote,
      bill,
      coverage,
    ]),
    citySlug: city.slug,
    cityLabel: `${getCityDisplayName(city)}, ${city.state}`,
    designationNotice,
    bill,
    coverage,
    estimate,
    result,
    notices: Object.freeze(notices),
    stateIncentiveNote: city.stateIncentiveNote,
    explanation: `Monthly consumption is your bill divided by ${city.utilityName}'s $${city.utilityRatePerKwh}/kWh rate. Each ${city.panelWatts} W panel generates an estimated ${numbers.format(estimate.generationPerPanelKwh)} kWh/month from ${city.peakSunHoursPerDay} peak sun hours/day and a performance factor of ${city.performanceRatio * 100}%. Panel counts round up, with a minimum of ${city.minPanels} panels. Installation costs $${city.costPerWattInstalled}/W; the ${city.federalCreditRate * 100}% federal credit reduces the investment. Savings are capped at your bill; payback divides net investment by twelve months of capped savings. These are fictional estimates, not tax advice.`,
    disclaimer:
      'These are fictional estimates, not tax advice, a quote, or a guarantee of savings, production, or payback. The modeled federal tax credit is subtracted from installation cost to show net investment; it is not an upfront discount or cash payment. Eligibility and usable credit depend on applicable law and your tax circumstances. The state incentive described above is not included in the financial calculation. Actual roof suitability, equipment, utility terms, installation costs, and incentives require individual assessment.',
  });
}
