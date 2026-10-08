// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { phoenix } from './phoenix';
import { cityStructuredData, serializeJsonLd } from './city-structured-data';
import { SITE_ORIGIN } from '../site';

describe('structured data script boundary', () => {
  it('keeps hostile city content inside one parseable JSON-LD script', () => {
    const injected = '</script><script>alert("city")</script>\u2028\u2029';
    const city = { ...phoenix, metroArea: injected };
    const serialized = serializeJsonLd(cityStructuredData(city));
    const document = new DOMParser().parseFromString(
      `<script type="application/ld+json">${serialized}</script>`,
      'text/html',
    );
    expect(document.scripts).toHaveLength(1);
    const parsed = JSON.parse(document.scripts[0].textContent ?? '');
    expect(parsed['@graph'][1].description).toContain(injected);
    expect(parsed['@graph'][1]['@id']).toBe(
      `${SITE_ORIGIN}/city/phoenix-az#webpage`,
    );
  });
  it('keeps the unavailable root out of WebSite visit URLs', () => {
    const structuredData = cityStructuredData(phoenix);
    const graph = structuredData['@graph'];
    const website = graph[0];
    const cityPage = graph[1];

    expect(website).toMatchObject({
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
    });
    expect(website).not.toHaveProperty('url');
    expect(cityPage).toMatchObject({
      '@type': 'WebPage',
      url: `${SITE_ORIGIN}/city/phoenix-az`,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    });
  });
});
