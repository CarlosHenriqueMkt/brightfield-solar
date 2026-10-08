import Image from 'next/image';
import { isValidElement, type ReactNode } from 'react';
import type { CityConfig } from '@/domain/cities/city-config';
import { SpecialistCTA } from '@/components/ui/SpecialistCTA';
import styles from './FinalCTA.module.css';

type FinalCTAProps = {
  city: Pick<CityConfig, 'finalCTA'>;
  action: ReactNode;
  id?: string;
};

export function FinalCTA({ city, action, id = 'final-cta' }: FinalCTAProps) {
  const actionClassName = isValidElement<{ className?: string }>(action)
    ? (action.props.className ?? '')
    : '';

  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.frame}>
        <div className={styles.media}>
          <Image
            src={city.finalCTA.image.src}
            alt={city.finalCTA.image.alt}
            width={1672}
            height={941}
            className={styles.mediaImage}
            sizes="(max-width: 640px) 100vw, (max-width: 1440px) 90vw, 1296px"
          />
        </div>
        <div className={styles.copy}>
          <h2 id={`${id}-title`}>{city.finalCTA.title}</h2>
          <p>{city.finalCTA.description}</p>
          <div className={styles.actions}>
            {action}
            <SpecialistCTA
              className={styles.specialist}
              triggerClassName={actionClassName}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
