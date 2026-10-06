import { validateCityConfig, type CityConfig } from './city-config';
import { phoenix } from './phoenix';

const cities: Readonly<Record<string, CityConfig>> = {
  [phoenix.slug]: phoenix,
};

for (const city of Object.values(cities)) {
  validateCityConfig(city);
}

export function getCityBySlug(slug: string): CityConfig | undefined {
  return Object.hasOwn(cities, slug) ? cities[slug] : undefined;
}

export function getAllCitySlugs(): string[] {
  return Object.keys(cities);
}
