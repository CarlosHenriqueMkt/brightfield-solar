import { describe, expect, it } from 'vitest';
import { getAllCitySlugs, getCityBySlug } from './cities';
import { validateCityConfig } from './city-config';
import { phoenix } from './phoenix';

describe('city registry', () => {
  it('publishes only the registered Phoenix route', () => {
    expect(getAllCitySlugs()).toEqual(['phoenix-az']);
  });

  it('resolves Phoenix with its city identity', () => {
    expect(getCityBySlug('phoenix-az')).toMatchObject({
      slug: 'phoenix-az',
      city: 'Phoenix',
      state: 'AZ',
      stateFull: 'Arizona',
    });
  });

  it.each([
    'slug-inexistente',
    '',
    'PHOENIX-AZ',
    '../phoenix-az',
    'constructor',
    '__proto__',
  ])('does not resolve an unregistered slug: %s', (slug) => {
    expect(getCityBySlug(slug)).toBeUndefined();
  });
});

describe('city data validation', () => {
  it('rejects a missing required field with its path', () => {
    const incomplete: Record<string, unknown> = { ...phoenix };
    delete incomplete.utilityName;
    expect(() => validateCityConfig(incomplete)).toThrow(/utilityName/);
  });

  it.each([
    ['slug', 'phoenix-ca'],
    ['city', ''],
    ['state', 'Arizona'],
    ['utilityRatePerKwh', 0],
    ['peakSunHoursPerDay', 25],
    ['panelWatts', 450.5],
    ['performanceRatio', 0],
    ['performanceRatio', 1.1],
    ['costPerWattInstalled', -1],
    ['minPanels', 0],
    ['minPanels', 8.5],
    ['federalCreditRate', -0.1],
    ['federalCreditRate', 1.1],
    ['utilityRatePerKwh', NaN],
    ['costPerWattInstalled', Infinity],
    ['installsCompleted', -1],
    ['crewsAvailable', 1.5],
    ['avgRating', 5.1],
    ['avgPermitDays', 0],
    ['popularNeighborhoods', ['']],
    ['householdProfiles', [{ label: 'Small home', typicalBill: 35 }]],
    ['householdProfiles', [{ label: 'Large home', typicalBill: 610 }]],
    ['householdProfiles', [{ label: 'Small home', typicalBill: 95 }]],
    ['crews', [{ ...phoenix.crews[0], rating: 6 }]],
    ['testimonials', [{ ...phoenix.testimonials[0], date: '2025-02-30' }]],
    ['faq', [{ q: 'Question?', a: '' }]],
    ['faq', []],
  ])('rejects invalid %s: %j', (field, value) => {
    expect(() => validateCityConfig({ ...phoenix, [field]: value })).toThrow(
      new RegExp(field),
    );
  });

  it.each([null, [], 'Phoenix'])('rejects a non-object city: %j', (value) => {
    expect(() => validateCityConfig(value)).toThrow(
      /Invalid CityConfig at city/,
    );
  });
});
