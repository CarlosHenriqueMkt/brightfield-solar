import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllCitySlugs, getCityBySlug } from '@/domain/cities/cities';
import { Hero } from '@/components/sections/Hero';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { SocialProof } from '@/components/sections/SocialProof';
import { FAQ } from '@/components/sections/FAQ';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { SimulatorHero } from '@/features/simulator/SimulatorHero';
import { ScenePoster } from '@/features/scene/ScenePoster';
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
    <>
      <header className={styles.header}>
        <a
          className={styles.brand}
          href="#hero"
          aria-label="Brightfield Solar home"
        >
          Brightfield<small>SOLAR</small>
        </a>
        <a
          className={styles.navAction}
          href="#solar-estimate"
          data-open-simulation
          aria-label="See my solar estimate"
        >
          <span>See my solar estimate</span>
          <span aria-hidden="true">→</span>
        </a>
      </header>
      <main>
        <SimulatorHero city={city}>
          <Hero
            city={city}
            fullViewport
            sceneSlot={<ScenePoster className={styles.heroImage} />}
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
        <ProcessSteps id="installation" />
        <SocialProof
          city={city}
          testimonials={city.testimonials}
          crews={city.crews}
        />
        <FAQ items={city.faq} />
        <FinalCTA
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
          Residential solar in {city.city}, {city.stateFull}
        </div>
        <p>
          Fictional project. Estimates and testimonials are for demonstration
          only.
        </p>
        <span>{city.phone}</span>
      </footer>
    </>
  );
}
