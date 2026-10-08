import {
  getCityDisplayName,
  type CityConfig,
} from '@/domain/cities/city-config';
import { escapeMarkdownText } from '@/domain/cities/city-markdown';
import { getRegisteredCities } from '@/domain/cities/cities';
import {
  canonicalUrl,
  cityMarkdownUrl,
  cityUrl,
  SITE_NAME,
} from '@/domain/site';

export const dynamic = 'force-static';

function cityResources(city: CityConfig): string[] {
  const label = escapeMarkdownText(getCityDisplayName(city));
  return [
    `- [${label} Markdown](${cityMarkdownUrl(city)}): Agent-readable city identity, simulator assumptions, process, fictional profiles, testimonials, and FAQ.`,
    `- [${label} interactive page](${cityUrl(city)}): Public HTML page with the interactive estimator and city content.`,
  ];
}

function buildLlmsText(): string {
  const cities = getRegisteredCities();
  const standardCities = cities.filter(
    (city) => city.designation.kind === 'standard',
  );
  const demoCities = cities.filter((city) => city.designation.kind === 'demo');
  const primaryCity = standardCities[0];
  const primaryLabel = primaryCity
    ? escapeMarkdownText(getCityDisplayName(primaryCity))
    : 'the standard city page';
  const standardResources = standardCities.flatMap(cityResources).join('\n');
  const demoResources = demoCities.flatMap(cityResources).join('\n');

  return `# ${SITE_NAME}

> A fictional solar-estimator challenge project with public city pages and compact Markdown alternatives for agents and other text-focused clients.

This site is a synthetic demonstration, not an operating solar company or a source of endorsements, customer evidence, financial advice, utility guidance, or tax advice.
${primaryLabel} is the primary standard-city example for the interactive estimator. Other city routes are explicitly synthetic demos used to show how registry-driven scenarios can differ.
Use Markdown destinations when you need the city content without the interactive presentation. Crew records, testimonials, company details, financial assumptions, incentives, and contact details are fictional challenge content; no claims here should be treated as verified business information. The institutional homepage is outside this demonstration, so these city pages are the public content surfaces.

## Primary city pages

${standardResources}

## Supporting resources

- [Robots.txt](${canonicalUrl('/robots.txt')}): Crawler policy and production sitemap pointer.
- [Sitemap.xml](${canonicalUrl('/sitemap.xml')}): Production HTML city URL inventory; it does not include Markdown alternatives or demo routes.

## Optional

${demoResources}
`;
}

export function GET(): Response {
  return new Response(buildLlmsText(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
