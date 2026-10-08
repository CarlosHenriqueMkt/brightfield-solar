import type { CityConfig } from './cities/city-config';

export const SITE_NAME = 'Brightfield Solar';
export const FICTIONAL_PROJECT_NOTICE =
  'Fictional challenge project. The company, financial assumptions, incentives, teams and testimonials are illustrative, not verified business claims or current tax advice.';

export function validateProductionOrigin(value: string): string {
  const errorMessage =
    'SITE_ORIGIN must be an HTTPS origin without credentials, path, query or fragment.';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(errorMessage);
  }
  if (
    !/^https:\/\/[^/?#\\\s@]+\/?$/.test(value) ||
    value.endsWith(':') ||
    value.endsWith(':/') ||
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(errorMessage);
  }
  return url.origin;
}

export const SITE_ORIGIN = validateProductionOrigin(
  process.env.SITE_ORIGIN ?? 'https://brightfield-solar-three.vercel.app',
);

export function canonicalUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('Canonical paths must be site-relative absolute paths.');
  }
  const url = new URL(path, SITE_ORIGIN);
  url.search = '';
  url.hash = '';
  return url.href;
}

export function cityPath(city: Pick<CityConfig, 'slug'>): string {
  return `/city/${city.slug}`;
}

export function cityUrl(city: Pick<CityConfig, 'slug'>): string {
  return canonicalUrl(cityPath(city));
}

export function cityMarkdownUrl(city: Pick<CityConfig, 'slug'>): string {
  return canonicalUrl(`${cityPath(city)}/index.md`);
}

type DeploymentEnvironment = Readonly<{
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_TARGET_ENV?: string;
}>;

export function isProductionDeployment(
  env: DeploymentEnvironment = process.env,
): boolean {
  return (
    env.NODE_ENV === 'production' &&
    (env.VERCEL_ENV ?? 'production') === 'production' &&
    (env.VERCEL_TARGET_ENV ?? 'production') === 'production'
  );
}

export function isCityIndexable(
  city: Pick<CityConfig, 'designation'>,
  env: DeploymentEnvironment = process.env,
): boolean {
  return city.designation.kind === 'standard' && isProductionDeployment(env);
}
