import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getAllCitySlugs,
  getCityBySlug,
  getRegisteredCities,
} from '@/domain/cities/cities';
import { getCityDisplayName } from '@/domain/cities/city-config';
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

  return {
    title: `Solar in ${getCityDisplayName(city)}, ${city.state} | Brightfield Solar`,
    description:
      city.designation.kind === 'demo'
        ? `${getCityDisplayName(city)}. ${city.designation.notice}`
        : `Explore residential solar in ${city.city}, ${city.stateFull}, with local information for the ${city.metroArea} area. Fictional challenge project.`,
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
      <header className={styles.header}>
        <a
          className={styles.brand}
          href="#hero"
          aria-label="Brightfield Solar home"
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
      </footer>
    </>
  );
}
