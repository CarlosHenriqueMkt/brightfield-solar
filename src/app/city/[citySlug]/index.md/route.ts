import { notFound } from 'next/navigation';
import { getAllCitySlugs, getCityBySlug } from '@/domain/cities/cities';
import { cityMarkdown } from '@/domain/cities/city-markdown';
import { canonicalUrl, cityUrl } from '@/domain/site';

export const dynamicParams = false;
export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllCitySlugs().map((citySlug) => ({ citySlug }));
}

type CityMarkdownRouteContext = {
  params: Promise<{ citySlug: string }>;
};

export async function GET(
  _request: Request,
  context: CityMarkdownRouteContext,
): Promise<Response> {
  const { citySlug } = await context.params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return new Response(cityMarkdown(city), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Robots-Tag': 'noindex, follow',
      Link: `<${cityUrl(city)}>; rel="canonical", <${canonicalUrl('/llms.txt')}>; rel="describedby"`,
    },
  });
}
