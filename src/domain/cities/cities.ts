import {
  validateCityRegistry,
  type CityConfig,
  type CityRegistry,
} from './city-config';
import { cityA } from './city-a';
import { cityB } from './city-b';
import { phoenix } from './phoenix';

const cities: CityRegistry = {
  [phoenix.slug]: phoenix,
  [cityA.slug]: cityA,
  [cityB.slug]: cityB,
};

validateCityRegistry(cities);

export function getCityBySlug(slug: string): CityConfig | undefined {
  return Object.hasOwn(cities, slug) ? cities[slug] : undefined;
}

export function getAllCitySlugs(): string[] {
  return Object.keys(cities);
}

export function getRegisteredCities(): readonly CityConfig[] {
  return Object.values(cities);
}

export { validateCityConfig, validateCityRegistry } from './city-config';
