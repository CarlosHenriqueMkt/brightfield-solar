import type { ReactNode } from 'react';
import type { CityConfig } from '@/domain/cities/city-config';
import styles from './Hero.module.css';

export function Hero({
  city,
  sceneSlot,
  controlsSlot,
  id = 'hero',
  headingAs: Heading = 'h1',
}: {
  city: Pick<CityConfig, 'city' | 'stateFull'>;
  sceneSlot: ReactNode;
  controlsSlot: ReactNode;
  id?: string;
  headingAs?: 'h1' | 'h2';
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={styles.hero}>
      <div className={styles.scene}>{sceneSlot}</div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          Residential solar in {city.city}, {city.stateFull}
        </p>
        <Heading id={`${id}-title`} className={styles.title}>
          A brighter home.
          <br />A clearer choice.
        </Heading>
        <p className={styles.lead}>
          Explore the cost and estimated savings of solar for your {city.city}{' '}
          home. See the numbers, understand the next steps and decide what makes
          sense for you.
        </p>
      </div>
      <div className={styles.controls}>{controlsSlot}</div>
      <p className={styles.caption}>
        Illustrative home. Roof fit needs an assessment.
      </p>
    </section>
  );
}
