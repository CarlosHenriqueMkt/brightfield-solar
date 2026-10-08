import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMetadata } from './page';
import { SITE_ORIGIN } from '@/domain/site';

function routeProps(citySlug: string): PageProps<'/city/[citySlug]'> {
  return {
    params: Promise.resolve({ citySlug }),
    searchParams: Promise.resolve({
      utm_source: 'shared-link',
      campaign: 'test',
    }),
  };
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('VERCEL_TARGET_ENV', undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe('public city publication policy', () => {
  it('keeps tracking parameters out of the canonical and social identity', async () => {
    const metadata = await generateMetadata(routeProps('phoenix-az'));
    expect(metadata.alternates?.canonical).toBe(
      `${SITE_ORIGIN}/city/phoenix-az`,
    );
    expect(metadata.openGraph).toMatchObject({
      url: `${SITE_ORIGIN}/city/phoenix-az`,
    });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it.each(['city-a', 'city-b'])(
    'lets crawlers read %s noindex without canonicalizing it to Phoenix',
    async (slug) => {
      const metadata = await generateMetadata(routeProps(slug));
      expect(metadata.alternates?.canonical).toBe(
        `${SITE_ORIGIN}/city/${slug}`,
      );
      expect(metadata.robots).toMatchObject({ index: false, follow: true });
    },
  );

  it.each(['preview', 'development'])(
    'prevents indexing a %s deployment without changing canonical identity',
    async (deployment) => {
      vi.stubEnv('VERCEL_ENV', deployment);
      const metadata = await generateMetadata(routeProps('phoenix-az'));
      expect(metadata.robots).toMatchObject({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe(
        `${SITE_ORIGIN}/city/phoenix-az`,
      );
    },
  );

  it.each(['unknown-city', 'edge-fixture', 'toString', '__proto__'])(
    'never substitutes another city for unregistered slug %s',
    async (slug) => {
      await expect(generateMetadata(routeProps(slug))).rejects.toThrow(
        'NEXT_HTTP_ERROR_FALLBACK;404',
      );
    },
  );
});
