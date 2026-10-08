import { describe, expect, it } from 'vitest';
import {
  canonicalUrl,
  isProductionDeployment,
  SITE_ORIGIN,
  validateProductionOrigin,
} from './site';

describe('production identity boundaries', () => {
  it.each([
    '',
    'http://example.com',
    'https://example.com/path',
    'https://example.com?utm_source=test',
    'https://example.com?',
    'https://example.com#',
    'https://user:password@example.com',
    'https://@example.com',
    'https://example.com:',
    ' https://example.com',
    'https://example.com\\other',
    'not-a-url',
  ])('rejects an ambiguous or malformed origin: %j', (origin) => {
    expect(() => validateProductionOrigin(origin)).toThrow(/SITE_ORIGIN/);
  });

  it('normalizes a root trailing slash without creating a double-slash identity', () => {
    expect(validateProductionOrigin('https://example.com/')).toBe(
      'https://example.com',
    );
  });

  it('removes query and fragment without accepting a foreign origin', () => {
    expect(canonicalUrl('/city/phoenix-az?utm_source=message#faq')).toBe(
      `${SITE_ORIGIN}/city/phoenix-az`,
    );
    expect(() => canonicalUrl('//preview.example/city/phoenix-az')).toThrow();
    expect(() =>
      canonicalUrl('https://preview.example/city/phoenix-az'),
    ).toThrow();
  });

  it.each([
    [{ NODE_ENV: 'development' }, false],
    [{ NODE_ENV: 'test' }, false],
    [{ NODE_ENV: 'production' }, true],
    [{ NODE_ENV: 'production', VERCEL_ENV: 'preview' }, false],
    [{ NODE_ENV: 'production', VERCEL_ENV: 'development' }, false],
    [{ NODE_ENV: 'production', VERCEL_ENV: 'production' }, true],
    [
      {
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
        VERCEL_TARGET_ENV: 'staging',
      },
      false,
    ],
  ] as const)('applies deployment precedence for %j', (env, expected) => {
    expect(isProductionDeployment(env)).toBe(expected);
  });
});
