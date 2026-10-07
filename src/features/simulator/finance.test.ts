import { describe, expect, it } from 'vitest';

import { getCityBySlug } from '@/domain/cities/cities';
import type { CityConfig } from '@/domain/cities/city-config';
import { phoenix } from '@/domain/cities/phoenix';
import { calculateSolarEstimate, validateSimulationInput } from './finance';

function registryCity(slug: string): CityConfig {
  const city = getCityBySlug(slug);
  if (!city) throw new Error(`Missing registered test city: ${slug}`);
  return city;
}

interface PhoenixOracle {
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

function phoenixIntegerOracle(bill: number, coverage: number): PhoenixOracle {
  // Phoenix's decimal inputs reduce to these exact rational quantities:
  // Generation is 351/5 kWh per panel-month; required is:
  // ceil(bill * coverage / 1053).
  const requiredPanels = Math.floor((bill * coverage + 1052) / 1053);
  const installedPanels = Math.max(8, requiredPanels);
  const grossCost = installedPanels * 1237.5;
  const netCost = installedPanels * 866.25;
  const rawSavings = installedPanels * 10.53;
  const monthlySavings = Math.min(rawSavings, bill);

  return {
    consumptionKwh: (bill * 20) / 3,
    generationPerPanelKwh: 351 / 5,
    requiredPanels,
    installedPanels,
    grossCost,
    netCost,
    monthlySavings,
    paybackYears: netCost / (monthlySavings * 12),
    minimumApplied: requiredPanels < 8,
    savingsCapped: rawSavings >= bill,
    excessCredit: rawSavings > bill,
  };
}

function expectEstimateToMatchOracle(bill: number, coverage: number): void {
  const estimate = calculateSolarEstimate(phoenix, bill, coverage);
  const expected = phoenixIntegerOracle(bill, coverage);

  expect(estimate.requiredPanels).toBe(expected.requiredPanels);
  expect(estimate.installedPanels).toBe(expected.installedPanels);
  expect(estimate.minimumApplied).toBe(expected.minimumApplied);
  expect(estimate.savingsCapped).toBe(expected.savingsCapped);
  expect(estimate.excessCredit).toBe(expected.excessCredit);
  expect(estimate.consumptionKwh).toBeCloseTo(expected.consumptionKwh, 12);
  expect(estimate.generationPerPanelKwh).toBeCloseTo(
    expected.generationPerPanelKwh,
    12,
  );
  expect(estimate.grossCost).toBeCloseTo(expected.grossCost, 12);
  expect(estimate.netCost).toBeCloseTo(expected.netCost, 9);
  expect(estimate.monthlySavings).toBeCloseTo(expected.monthlySavings, 12);
  expect(estimate.paybackYears).toBeCloseTo(expected.paybackYears, 12);
  expect(estimate.installedPanels).toBeGreaterThanOrEqual(phoenix.minPanels);
  expect(Number.isInteger(estimate.requiredPanels)).toBe(true);
  expect(Number.isInteger(estimate.installedPanels)).toBe(true);
  expect(estimate.netCost).toBeCloseTo(
    estimate.grossCost * (1 - phoenix.federalCreditRate),
    12,
  );
  expect(estimate.monthlySavings).toBeLessThanOrEqual(bill);
  if (estimate.excessCredit) {
    expect(estimate.savingsCapped).toBe(true);
  }
}

describe('calculateSolarEstimate', () => {
  it('matches every Phoenix input with an independent oracle', () => {
    for (let bill = 40; bill <= 600; bill += 10) {
      for (let coverage = 50; coverage <= 100; coverage += 5) {
        expectEstimateToMatchOracle(bill, coverage);
      }
    }
  });

  it('handles an integral count when floating point is slightly high', () => {
    const edgeCity = {
      ...phoenix,
      utilityRatePerKwh: 0.1,
      panelWatts: 100,
      peakSunHoursPerDay: 0.3,
      performanceRatio: 0.1,
      minPanels: 1,
    };

    // Exact arithmetic gives (90 / 0.1) * 55% / 0.09 = 5500 panels.
    expect(calculateSolarEstimate(edgeCity, 90, 55).requiredPanels).toBe(5500);
  });

  it('ceil rounds a genuine above-boundary result past tolerance', () => {
    const edgeCity = {
      ...phoenix,
      utilityRatePerKwh: 0.1,
      panelWatts: 100,
      peakSunHoursPerDay: 0.3,
      performanceRatio: 0.09999999999,
      minPanels: 1,
    };

    expect(calculateSolarEstimate(edgeCity, 90, 55).requiredPanels).toBe(5501);
  });

  it.each([
    [220, 80, 17, 14726.25, 179.01, 6.9],
    [430, 80, 33, 28586.25, 347.49, 6.9],
    [430, 100, 41, 35516.25, 430, 6.9],
    [90, 100, 9, 7796.25, 90, 7.2],
    [90, 80, 8, 6930, 84.24, 6.9],
    [60, 100, 8, 6930, 60, 9.6],
    [60, 50, 8, 6930, 60, 9.6],
    [600, 100, 57, 49376.25, 600, 6.9],
  ])(
    'calculates the approved result for bill %d and coverage %d',
    (bill, coverage, panels, netCost, savings, payback) => {
      const estimate = calculateSolarEstimate(phoenix, bill, coverage);

      expect(estimate.installedPanels).toBe(panels);
      expect(estimate.netCost).toBeCloseTo(netCost, 9);
      expect(estimate.monthlySavings).toBeCloseTo(savings, 12);
      expect(estimate.paybackYears).toBeCloseTo(payback, 1);
    },
  );

  it.each([
    [
      'city-a',
      220,
      80,
      {
        consumptionKwh: 1100,
        generationPerPanelKwh: 45,
        requiredPanels: 20,
        installedPanels: 20,
        grossCost: 24000,
        netCost: 18000,
        monthlySavings: 180,
        paybackYears: 25 / 3,
        minimumApplied: false,
        savingsCapped: false,
        excessCredit: false,
      },
    ],
    [
      'city-b',
      220,
      80,
      {
        consumptionKwh: 2200,
        generationPerPanelKwh: 48,
        requiredPanels: 37,
        installedPanels: 37,
        grossCost: 44400,
        netCost: 35520,
        monthlySavings: 177.6,
        paybackYears: 50 / 3,
        minimumApplied: false,
        savingsCapped: false,
        excessCredit: false,
      },
    ],
    [
      'city-a',
      90,
      100,
      {
        consumptionKwh: 450,
        generationPerPanelKwh: 45,
        requiredPanels: 10,
        installedPanels: 10,
        grossCost: 12000,
        netCost: 9000,
        monthlySavings: 90,
        paybackYears: 25 / 3,
        minimumApplied: false,
        savingsCapped: true,
        excessCredit: false,
      },
    ],
    [
      'city-b',
      90,
      100,
      {
        consumptionKwh: 900,
        generationPerPanelKwh: 48,
        requiredPanels: 19,
        installedPanels: 19,
        grossCost: 22800,
        netCost: 18240,
        monthlySavings: 90,
        paybackYears: 152 / 9,
        minimumApplied: false,
        savingsCapped: true,
        excessCredit: true,
      },
    ],
  ])(
    'matches independent literal demo result for %s at bill %d and coverage %d',
    (slug, bill, coverage, expected) => {
      const estimate = calculateSolarEstimate(
        registryCity(slug),
        bill,
        coverage,
      );
      expect(estimate.consumptionKwh).toBeCloseTo(expected.consumptionKwh, 12);
      expect(estimate.generationPerPanelKwh).toBeCloseTo(
        expected.generationPerPanelKwh,
        12,
      );
      expect(estimate.requiredPanels).toBe(expected.requiredPanels);
      expect(estimate.installedPanels).toBe(expected.installedPanels);
      expect(estimate.grossCost).toBeCloseTo(expected.grossCost, 12);
      expect(estimate.netCost).toBeCloseTo(expected.netCost, 12);
      expect(estimate.monthlySavings).toBeCloseTo(expected.monthlySavings, 12);
      expect(estimate.paybackYears).toBeCloseTo(expected.paybackYears, 12);
      expect(estimate.minimumApplied).toBe(expected.minimumApplied);
      expect(estimate.savingsCapped).toBe(expected.savingsCapped);
      expect(estimate.excessCredit).toBe(expected.excessCredit);
    },
  );

  it('reports minimum sizing and capped savings for a small bill', () => {
    const estimate = calculateSolarEstimate(phoenix, 60, 100);

    expect(estimate.requiredPanels).toBe(6);
    expect(estimate.installedPanels).toBe(8);
    expect(estimate.minimumApplied).toBe(true);
    expect(estimate.savingsCapped).toBe(true);
    expect(estimate.excessCredit).toBe(true);
  });

  it('does not cap savings when generation is below the bill', () => {
    const estimate = calculateSolarEstimate(phoenix, 220, 80);

    expect(estimate.savingsCapped).toBe(false);
    expect(estimate.excessCredit).toBe(false);
  });
});

describe('validateSimulationInput', () => {
  it.each([
    [NaN, 80],
    [Infinity, 80],
    [-Infinity, 80],
    [30, 80],
    [610, 80],
    [45, 80],
    [220, NaN],
    [220, Infinity],
    [220, -Infinity],
    [220, 45],
    [220, 105],
    [220, 52],
  ])('rejects invalid simulation input %j', (bill, coverage) => {
    expect(() => validateSimulationInput(bill, coverage)).toThrowError(
      RangeError,
    );
  });
});
