import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllCitySlugs, getCityBySlug } from '@/domain/cities/cities';
import styles from './page.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCitySlugs().map((citySlug) => ({ citySlug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/city/[citySlug]'>): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return {
    title: `Solar in ${city.city}, ${city.state} | Brightfield Solar`,
    description: `Explore residential solar in ${city.city}, ${city.stateFull}, with local information for the ${city.metroArea} area. Fictional challenge project.`,
  };
}

export default async function CityPage({
  params,
}: PageProps<'/city/[citySlug]'>) {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return (
    <main className={styles.main}>
      <p className={styles.brand}>Brightfield Solar</p>
      <h1>
        Solar in {city.city}, {city.state}
      </h1>
      <p>
        Local information for the {city.metroArea} area in {city.stateFull}.
      </p>
      <p>
        Fictional challenge project. This foundation page is not tax advice.
      </p>
    </main>
  );
}
