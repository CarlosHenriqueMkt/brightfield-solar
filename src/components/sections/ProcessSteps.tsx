import Image from 'next/image';
import type { CityConfig } from '@/domain/cities/city-config';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SpecialistCTA } from '@/components/ui/SpecialistCTA';
import styles from './ProcessSteps.module.css';

export function ProcessSteps({
  city,
  id = 'process',
}: {
  city: Pick<CityConfig, 'process'>;
  id?: string;
}) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <Container>
        <SectionHeading
          id={`${id}-title`}
          eyebrow={city.process.eyebrow}
          title={city.process.title}
          description={city.process.description}
        />
        <ol className={styles.steps}>
          {city.process.steps.map((step, index) => (
            <li
              className={`${styles.step} ${index % 2 === 1 ? styles.reverse : ''}`}
              key={`${step.title}-${index}`}
            >
              <div className={styles.media}>
                <Image
                  src={step.image.src}
                  alt={step.image.alt}
                  width={1448}
                  height={1086}
                  className={styles.mediaImage}
                  sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1440px) 48vw, 665px"
                />
              </div>
              <div className={styles.copy}>
                <span className={styles.number}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <SpecialistCTA className={styles.specialist} />
      </Container>
    </section>
  );
}
