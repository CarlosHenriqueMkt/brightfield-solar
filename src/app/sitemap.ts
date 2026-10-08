import type { MetadataRoute } from 'next';
import { getRegisteredCities } from '@/domain/cities/cities';
import { cityUrl, isCityIndexable } from '@/domain/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return getRegisteredCities()
    .filter((city) => isCityIndexable(city))
    .map((city) => ({ url: cityUrl(city) }));
}
