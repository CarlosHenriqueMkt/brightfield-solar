import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

function routeProps(citySlug: string): PageProps<'/city/[citySlug]'> {
  return {
    params: Promise.resolve({ citySlug }),
    searchParams: Promise.resolve({}),
  };
}

describe('public city metadata', () => {
  it('preserves Phoenix identity without a synthetic-city designation', async () => {
    const metadata = await generateMetadata(routeProps('phoenix-az'));
    expect(metadata.title).toContain('Phoenix, AZ');
    expect(metadata.title).not.toContain('(Demo)');
    expect(metadata.description).toContain('Arizona');
    expect(metadata.description).toContain('Fictional challenge project');
  });

  it.each([
    ['city-a', 'City A (Demo)'],
    ['city-b', 'City B (Demo)'],
  ])(
    'identifies %s as synthetic rather than a verified locality',
    async (slug, label) => {
      const metadata = await generateMetadata(routeProps(slug));
      expect(metadata.title).toContain(label);
      expect(metadata.description).toContain(label);
      expect(metadata.description).toMatch(/synthetic/i);
      expect(metadata.description).toMatch(/not verified/i);
      expect(`${metadata.title} ${metadata.description}`).not.toMatch(
        /Phoenix|Arizona/,
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
