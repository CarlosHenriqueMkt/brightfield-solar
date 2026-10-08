import type { CityConfig } from './city-config';
import { cityDescription, cityTitle } from './city-publication';
import {
  canonicalUrl,
  cityUrl,
  FICTIONAL_PROJECT_NOTICE,
  SITE_NAME,
} from '../site';

export function cityStructuredData(city: CityConfig) {
  const url = cityUrl(city);
  const websiteId = `${canonicalUrl('/')}#website`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: SITE_NAME,
        description: FICTIONAL_PROJECT_NOTICE,
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: cityTitle(city),
        description: `${cityDescription(city)} ${FICTIONAL_PROJECT_NOTICE}`,
        inLanguage: 'en-US',
        isPartOf: { '@id': websiteId },
      },
    ],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
