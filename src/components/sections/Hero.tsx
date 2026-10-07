import Image from 'next/image';
import type { ReactNode } from 'react';
import type { CityConfig } from '@/domain/cities/city-config';
import { Motto } from './Motto';
import styles from './Hero.module.css';

export function Hero({
  city,
  sceneSlot,
  controlsSlot,
  id = 'hero',
  headingAs: Heading = 'h1',
  fullViewport = false,
}: {
  city: Pick<CityConfig, 'city' | 'stateFull'>;
  sceneSlot: ReactNode;
  controlsSlot: ReactNode;
  id?: string;
  headingAs?: 'h1' | 'h2';
  fullViewport?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`${styles.hero} ${fullViewport ? styles.fullViewport : ''}`}
    >
      <div className={styles.scene} data-hero-poster>
        {sceneSlot}
      </div>
      <div className={styles.cover} data-hero-cover>
        {fullViewport && (
          <Image
            className={styles.motif}
            src="/assets/hero-panels.svg"
            width={1200}
            height={700}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="eager"
            unoptimized
          />
        )}
        <div className={styles.coverContent}>
          <div className={styles.intro} data-hero-intro>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>
                Residential solar in {city.city}, {city.stateFull}
              </p>
              <Motto id={`${id}-title`} className={styles.title} as={Heading} />
              <p className={styles.lead}>
                Explore the cost and estimated savings of solar for your{' '}
                {city.city} home. See the numbers, understand the next steps and
                decide what makes sense for you.
              </p>
            </div>
            <div className={styles.controls}>{controlsSlot}</div>
          </div>
          <p className={styles.caption} data-hero-intro>
            Illustrative home. Roof fit needs an assessment.
          </p>
        </div>
      </div>
    </section>
  );
}
