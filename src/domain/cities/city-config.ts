export interface CityConfig {
  readonly slug: string;
  readonly city: string;
  readonly state: string;
  readonly stateFull: string;
  readonly metroArea: string;
  readonly utilityName: string;
  readonly utilityRatePerKwh: number;
  readonly peakSunHoursPerDay: number;
  readonly panelWatts: number;
  readonly performanceRatio: number;
  readonly costPerWattInstalled: number;
  readonly minPanels: number;
  readonly federalCreditRate: number;
  readonly stateIncentiveNote: string;
  readonly installsCompleted: number;
  readonly crewsAvailable: number;
  readonly avgRating: number;
  readonly avgPermitDays: number;
  readonly phone: string;
  readonly popularNeighborhoods: readonly string[];
  readonly householdProfiles: readonly {
    readonly label: string;
    readonly typicalBill: number;
  }[];
  readonly crews: readonly {
    readonly name: string;
    readonly installs: number;
    readonly rating: number;
    readonly since: number;
    readonly blurb: string;
  }[];
  readonly testimonials: readonly {
    readonly quote: string;
    readonly author: string;
    readonly neighborhood: string;
    readonly date: string;
  }[];
  readonly faq: readonly {
    readonly q: string;
    readonly a: string;
  }[];
}

function invalid(path: string, requirement: string): never {
  throw new Error(`Invalid CityConfig at ${path}: ${requirement}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(path, 'expected an object');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(path, 'expected a non-empty string');
  }
  return value;
}

function number(
  value: unknown,
  path: string,
  min: number,
  max = Infinity,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    invalid(path, `expected a finite number between ${min} and ${max}`);
  }
  return value;
}

function positive(value: unknown, path: string, max = Infinity): number {
  const result = number(value, path, 0, max);
  if (result === 0) invalid(path, 'expected a number greater than zero');
  return result;
}

function integer(value: unknown, path: string, min: number): number {
  const result = number(value, path, min);
  if (!Number.isSafeInteger(result)) invalid(path, 'expected a safe integer');
  return result;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    invalid(path, 'expected a non-empty array');
  }
  return value;
}

export function validateCityConfig(
  value: unknown,
): asserts value is CityConfig {
  const city = record(value, 'city');
  for (const key of [
    'slug',
    'city',
    'state',
    'stateFull',
    'metroArea',
    'utilityName',
    'stateIncentiveNote',
    'phone',
  ]) {
    text(city[key], key);
  }
  const state = text(city.state, 'state');
  if (!/^[A-Z]{2}$/.test(state))
    invalid('state', 'expected a two-letter US state code');
  const citySlug = text(city.city, 'city')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (city.slug !== `${citySlug}-${state.toLowerCase()}`) {
    invalid('slug', 'must match the city name and state code');
  }
  positive(city.utilityRatePerKwh, 'utilityRatePerKwh');
  positive(city.peakSunHoursPerDay, 'peakSunHoursPerDay', 24);
  integer(city.panelWatts, 'panelWatts', 1);
  positive(city.performanceRatio, 'performanceRatio', 1);
  positive(city.costPerWattInstalled, 'costPerWattInstalled');
  integer(city.minPanels, 'minPanels', 1);
  number(city.federalCreditRate, 'federalCreditRate', 0, 1);
  integer(city.installsCompleted, 'installsCompleted', 0);
  integer(city.crewsAvailable, 'crewsAvailable', 1);
  number(city.avgRating, 'avgRating', 0, 5);
  integer(city.avgPermitDays, 'avgPermitDays', 1);

  list(city.popularNeighborhoods, 'popularNeighborhoods').forEach((item, i) => {
    text(item, `popularNeighborhoods[${i}]`);
  });
  list(city.householdProfiles, 'householdProfiles').forEach((item, i) => {
    const path = `householdProfiles[${i}]`;
    const profile = record(item, path);
    text(profile.label, `${path}.label`);
    const bill = number(profile.typicalBill, `${path}.typicalBill`, 40, 600);
    if (bill % 10 !== 0)
      invalid(`${path}.typicalBill`, 'must use $10 increments');
  });
  list(city.crews, 'crews').forEach((item, i) => {
    const path = `crews[${i}]`;
    const crew = record(item, path);
    text(crew.name, `${path}.name`);
    text(crew.blurb, `${path}.blurb`);
    integer(crew.installs, `${path}.installs`, 0);
    number(crew.rating, `${path}.rating`, 0, 5);
    integer(crew.since, `${path}.since`, 1);
  });
  list(city.testimonials, 'testimonials').forEach((item, i) => {
    const path = `testimonials[${i}]`;
    const testimonial = record(item, path);
    text(testimonial.quote, `${path}.quote`);
    text(testimonial.author, `${path}.author`);
    text(testimonial.neighborhood, `${path}.neighborhood`);
    const date = text(testimonial.date, `${path}.date`);
    const parsed = new Date(date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      invalid(
        `${path}.date`,
        'expected a valid ISO calendar date (YYYY-MM-DD)',
      );
    }
  });
  list(city.faq, 'faq').forEach((item, i) => {
    const path = `faq[${i}]`;
    const entry = record(item, path);
    text(entry.q, `${path}.q`);
    text(entry.a, `${path}.a`);
  });
}
