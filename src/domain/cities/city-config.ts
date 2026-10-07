export interface CityImage {
  readonly src: string;
  readonly alt: string;
  readonly decorative: boolean;
}

export interface CityDesignationStandard {
  readonly kind: 'standard';
}

export interface CityDesignationDemo {
  readonly kind: 'demo';
  readonly label: 'Demo';
  readonly notice: string;
}

export type CityDesignation = CityDesignationStandard | CityDesignationDemo;

export interface CityContactDisplay {
  readonly kind: 'display';
  readonly label: string;
}

export interface CityContactUnavailable {
  readonly kind: 'unavailable';
  readonly label: string;
}

export type CityContact = CityContactDisplay | CityContactUnavailable;

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
  readonly designation: CityDesignation;
  readonly contact: CityContact;
  readonly hero: {
    readonly description: string;
  };
  readonly scenePoster: {
    readonly desktopSrc: string;
    readonly mobileSrc: string;
    readonly alt: string;
  };
  readonly process: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly steps: readonly {
      readonly title: string;
      readonly copy: string;
      readonly image: CityImage;
    }[];
  };
  readonly socialProof: {
    readonly testimonialEyebrow: string;
    readonly testimonialTitle: string;
    readonly testimonialsLabel: string;
    readonly crewEyebrow: string;
    readonly crewTitle: string;
  };
  readonly finalCTA: {
    readonly title: string;
    readonly description: string;
    readonly image: CityImage;
  };
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
    readonly portrait: CityImage;
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

export type CityRegistry = Readonly<Record<string, CityConfig>>;
export function getCityDisplayName(
  city: Pick<CityConfig, 'city' | 'designation'>,
): string {
  return city.designation.kind === 'demo'
    ? `${city.city} (${city.designation.label})`
    : city.city;
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

function safeAssetPath(value: unknown, path: string): string {
  const source = text(value, path);
  const segments = source.split('/').slice(2);
  if (
    !source.startsWith('/assets/') ||
    source.includes('\\') ||
    source.includes('?') ||
    source.includes('#') ||
    source.includes('%') ||
    segments.length === 0 ||
    segments.some(
      (segment) => segment.length === 0 || segment === '..' || segment === '.',
    )
  ) {
    invalid(path, 'expected a safe local /assets/ path');
  }
  return source;
}

function image(value: unknown, path: string): CityImage {
  const item = record(value, path);
  const src = safeAssetPath(item.src, `${path}.src`);
  const alt =
    typeof item.alt === 'string'
      ? item.alt
      : invalid(`${path}.alt`, 'expected a string');
  const decorative = item.decorative;
  if (typeof decorative !== 'boolean') {
    invalid(`${path}.decorative`, 'expected a boolean');
  }
  if (decorative !== (alt.length === 0)) {
    invalid(path, 'decorative must be true exactly when alt is empty');
  }
  if (decorative === false && alt.trim().length === 0) {
    invalid(`${path}.alt`, 'expected meaningful alternative text');
  }
  return { src, alt, decorative };
}

function validateDesignation(value: unknown): CityDesignation {
  const designation = record(value, 'designation');
  const kind = designation.kind;
  if (kind === 'standard') {
    if (
      Object.hasOwn(designation, 'label') ||
      Object.hasOwn(designation, 'notice')
    ) {
      invalid('designation', 'standard designation cannot include demo fields');
    }
    return { kind: 'standard' };
  }
  if (kind === 'demo') {
    if (designation.label !== 'Demo') {
      invalid('designation.label', 'expected the literal label Demo');
    }
    const notice = text(designation.notice, 'designation.notice');
    return { kind: 'demo', label: 'Demo', notice };
  }
  invalid('designation.kind', 'expected standard or demo');
}

function validateContact(value: unknown): CityContact {
  const contact = record(value, 'contact');
  const kind = contact.kind;
  const label = text(contact.label, 'contact.label');
  if (kind === 'display') return { kind: 'display', label };
  if (kind === 'unavailable') return { kind: 'unavailable', label };
  invalid('contact.kind', 'expected display or unavailable');
}

function validateSlug(
  city: Record<string, unknown>,
  state: string,
  designation: CityDesignation,
): void {
  const cityName = text(city.city, 'city');
  const citySlug = cityName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const slug = text(city.slug, 'slug');
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    ['constructor', 'prototype', '__proto__'].includes(slug)
  ) {
    invalid('slug', 'must be a safe normalized slug');
  }
  const expected =
    designation.kind === 'demo'
      ? citySlug
      : `${citySlug}-${state.toLowerCase()}`;
  if (slug !== expected) {
    invalid(
      'slug',
      designation.kind === 'demo'
        ? 'must match the normalized city name for a demo'
        : 'must match the city name and state code',
    );
  }
}

export function validateCityConfig(
  value: unknown,
): asserts value is CityConfig {
  const city = record(value, 'city');
  const designation = validateDesignation(city.designation);
  const contact = validateContact(city.contact);
  for (const key of [
    'city',
    'state',
    'stateFull',
    'metroArea',
    'utilityName',
    'stateIncentiveNote',
  ]) {
    text(city[key], key);
  }
  const state = text(city.state, 'state');
  if (!/^[A-Z]{2}$/.test(state))
    invalid('state', 'expected a two-letter uppercase state code');
  validateSlug(city, state, designation);
  if (designation.kind === 'demo' && contact.kind !== 'unavailable') {
    invalid('contact.kind', 'demo cities must use an unavailable contact');
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

  const hero = record(city.hero, 'hero');
  text(hero.description, 'hero.description');
  const poster = record(city.scenePoster, 'scenePoster');
  safeAssetPath(poster.desktopSrc, 'scenePoster.desktopSrc');
  safeAssetPath(poster.mobileSrc, 'scenePoster.mobileSrc');
  text(poster.alt, 'scenePoster.alt');

  const process = record(city.process, 'process');
  text(process.eyebrow, 'process.eyebrow');
  text(process.title, 'process.title');
  text(process.description, 'process.description');
  list(process.steps, 'process.steps').forEach((item, i) => {
    const path = `process.steps[${i}]`;
    const step = record(item, path);
    text(step.title, `${path}.title`);
    text(step.copy, `${path}.copy`);
    image(step.image, `${path}.image`);
  });

  const socialProof = record(city.socialProof, 'socialProof');
  for (const key of [
    'testimonialEyebrow',
    'testimonialTitle',
    'testimonialsLabel',
    'crewEyebrow',
    'crewTitle',
  ]) {
    text(socialProof[key], `socialProof.${key}`);
  }
  const finalCTA = record(city.finalCTA, 'finalCTA');
  text(finalCTA.title, 'finalCTA.title');
  text(finalCTA.description, 'finalCTA.description');
  image(finalCTA.image, 'finalCTA.image');

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
    image(crew.portrait, `${path}.portrait`);
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

export function validateCityRegistry(
  value: unknown,
): asserts value is CityRegistry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid('registry', 'expected an object');
  }
  const registry = value as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(registry);
  if (prototype !== Object.prototype && prototype !== null) {
    invalid('registry', 'expected a plain object');
  }
  const entries = Object.entries(registry);
  if (entries.length === 0) {
    invalid('registry', 'expected at least one configuration');
  }
  for (const [key, config] of entries) {
    if (key === 'constructor' || key === 'prototype' || key === '__proto__') {
      invalid(`registry.${key}`, 'reserved prototype name is not allowed');
    }
    validateCityConfig(config);
    if (config.slug !== key) {
      invalid(`registry.${key}`, 'key must match config.slug');
    }
  }
}
