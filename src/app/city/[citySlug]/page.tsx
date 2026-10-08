import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAllCitySlugs,
  getCityBySlug,
  getRegisteredCities,
} from '@/domain/cities/cities';
import { getCityDisplayName } from '@/domain/cities/city-config';
import { cityDescription, cityTitle } from '@/domain/cities/city-publication';
import {
  cityStructuredData,
  serializeJsonLd,
} from '@/domain/cities/city-structured-data';
import {
  canonicalUrl,
  cityMarkdownUrl,
  cityPath,
  cityUrl,
  isCityIndexable,
  SITE_NAME,
} from '@/domain/site';
import { CitySelector } from '@/components/CitySelector';
import { Hero } from '@/components/sections/Hero';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { SocialProof } from '@/components/sections/SocialProof';
import { FAQ } from '@/components/sections/FAQ';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { SimulatorHero } from '@/features/simulator/SimulatorHero';
import { ScenePoster } from '@/features/scene/ScenePoster';
import styles from './page.module.css';

export const dynamicParams = false;

const cityOptions = getRegisteredCities().map((city) => ({
  slug: city.slug,
  label: getCityDisplayName(city),
}));

export function generateStaticParams() {
  return getAllCitySlugs().map((citySlug) => ({ citySlug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/city/[citySlug]'>): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  const title = cityTitle(city);
  const description = cityDescription(city);
  const url = cityUrl(city);
  const image = {
    url: canonicalUrl(`${cityPath(city)}/social-image`),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: `${SITE_NAME} — ${getCityDisplayName(city)}, ${city.stateFull}. Fictional challenge project; illustrative home.`,
  };

  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: { 'text/markdown': cityMarkdownUrl(city) },
    },
    robots: { index: isCityIndexable(city), follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
    other: { 'twitter:url': url },
  };
}

export default async function CityPage({
  params,
}: PageProps<'/city/[citySlug]'>) {
  const { citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(cityStructuredData(city)),
        }}
      />
      <header className={styles.header}>
        <a
          className={styles.brand}
          href="#hero"
          aria-label="Brightfield Solar — back to top"
        >
          Brightfield<small>SOLAR</small>
        </a>
        <CitySelector options={cityOptions} />
      </header>
      <main key={city.slug}>
        <SimulatorHero city={city}>
          <Hero
            city={city}
            fullViewport
            sceneSlot={<ScenePoster city={city} className={styles.heroImage} />}
            controlsSlot={
              <>
                <a
                  className={styles.primaryAction}
                  href="#solar-estimate"
                  data-open-simulation
                >
                  See my solar estimate <span aria-hidden="true">→</span>
                </a>
                <p className={styles.helper}>
                  Start with your average monthly electricity bill.
                </p>
              </>
            }
          />
        </SimulatorHero>
        <ProcessSteps city={city} id="installation" />
        <SocialProof city={city} />
        <FAQ items={city.faq} />
        <FinalCTA
          city={city}
          action={
            <a
              className={styles.lightAction}
              href="#solar-estimate"
              data-open-simulation
            >
              See my solar estimate <span aria-hidden="true">→</span>
            </a>
          }
        />
      </main>
      <footer className={styles.footer}>
        <div>
          <strong>Brightfield Solar</strong>
          <br />
          Residential solar in {getCityDisplayName(city)}, {city.stateFull}
        </div>
        <p>
          {city.designation.kind === 'demo'
            ? city.designation.notice
            : 'Fictional project. Estimates and testimonials are for demonstration only.'}
        </p>
        <span>{city.contact.label}</span>
        <nav className={styles.cityLinks} aria-label="Public cities">
          {cityOptions.map((option) => (
            <a
              key={option.slug}
              href={cityPath(option)}
              aria-current={option.slug === city.slug ? 'page' : undefined}
            >
              {option.label}
            </a>
          ))}
        </nav>
      </footer>
    </>
  );
}
