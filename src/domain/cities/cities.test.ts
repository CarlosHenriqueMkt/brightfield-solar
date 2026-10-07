import { describe, expect, it } from 'vitest';
import { cityA } from './city-a';
import { getAllCitySlugs, getCityBySlug, getRegisteredCities } from './cities';
import {
  getCityDisplayName,
  validateCityConfig,
  validateCityRegistry,
} from './city-config';
import { cityB } from './city-b';
import { phoenix } from './phoenix';

describe('city registry', () => {
  it('publishes the three registered city routes in stable order', () => {
    expect(getAllCitySlugs()).toEqual(['phoenix-az', 'city-a', 'city-b']);
    expect(getRegisteredCities()).toHaveLength(3);
  });

  it('derives public display labels from designation', () => {
    expect(getRegisteredCities().map(getCityDisplayName)).toEqual([
      'Phoenix',
      'City A (Demo)',
      'City B (Demo)',
    ]);
  });

  it('resolves Phoenix with its city identity and display contact', () => {
    expect(getCityBySlug('phoenix-az')).toMatchObject({
      slug: 'phoenix-az',
      city: 'Phoenix',
      state: 'AZ',
      stateFull: 'Arizona',
      designation: { kind: 'standard' },
      contact: { kind: 'display', label: '(602) 555-0147' },
    });
  });

  it('keeps demos non-operational and independently configured', () => {
    expect(cityA).not.toBe(cityB);
    expect(cityA.contact.kind).toBe('unavailable');
    expect(cityB.contact.kind).toBe('unavailable');
    expect(cityA.crews).toHaveLength(2);
    expect(cityB.crews).toHaveLength(4);
    expect(cityB.crews.every((crew) => crew.portrait)).toBe(true);
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

  it('reports invalid nested image fields rather than only the section', () => {
    const invalidImage = {
      ...phoenix,
      process: {
        ...phoenix.process,
        steps: [
          {
            ...phoenix.process.steps[0],
            image: { ...phoenix.process.steps[0].image, src: '../escape.png' },
          },
        ],
      },
    };
    expect(() => validateCityConfig(invalidImage)).toThrow(
      /process\.steps\[0\]\.image\.src/,
    );
  });

  it('enforces decorative alt intent and safe poster paths', () => {
    expect(() =>
      validateCityConfig({
        ...phoenix,
        finalCTA: {
          ...phoenix.finalCTA,
          image: { ...phoenix.finalCTA.image, decorative: true },
        },
      }),
    ).toThrow(/finalCTA\.image/);
    expect(() =>
      validateCityConfig({
        ...phoenix,
        scenePoster: {
          ...phoenix.scenePoster,
          desktopSrc: 'https://example.test/house.png',
        },
      }),
    ).toThrow(/scenePoster\.desktopSrc/);
  });

  it('requires a non-empty demo notice', () => {
    expect(() =>
      validateCityConfig({
        ...cityA,
        designation: { kind: 'demo', label: 'Demo', notice: '' },
      }),
    ).toThrow(/designation\.notice/);
  });

  it.each([null, [], 'Phoenix'])('rejects a non-object city: %j', (value) => {
    expect(() => validateCityConfig(value)).toThrow(
      /Invalid CityConfig at city/,
    );
  });
});

describe('registry consistency validation', () => {
  it('rejects a mismatched registry key', () => {
    expect(() => validateCityRegistry({ phoenix: phoenix })).toThrow(
      /registry\.phoenix/,
    );
  });

  it('rejects an inherited unknown registry prototype', () => {
    const registry = Object.create({ unexpected: phoenix }) as Record<
      string,
      unknown
    >;
    registry['phoenix-az'] = phoenix;
    expect(() => validateCityRegistry(registry)).toThrow(/registry/);
  });

  it('keeps an isolated future fixture out of public registration', () => {
    const edgeFixture = {
      ...cityA,
      city: 'Edge Fixture',
      slug: 'edge-fixture',
      state: 'XE',
    };
    validateCityConfig(edgeFixture);
    expect(getCityBySlug(edgeFixture.slug)).toBeUndefined();
  });
});
