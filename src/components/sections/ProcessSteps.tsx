import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import styles from './ProcessSteps.module.css';

const steps = [
  {
    number: '01',
    title: 'Assess your home',
    copy: 'A home assessment helps clarify your roof and the work involved.',
    media: '/assets/approved-v2/step-assess.png',
    alt: 'Solar professional assessing a Phoenix home',
  },
  {
    number: '02',
    title: 'Plan the work',
    copy: 'Review the proposed system and the permit process before installation.',
    media: '/assets/approved-v2/step-plan.png',
    alt: 'Solar plans and project details prepared for a home',
  },
  {
    number: '03',
    title: 'Install and connect',
    copy: 'Follow the steps from installation to utility interconnection.',
    media: '/assets/approved-v2/step-install.png',
    alt: 'Solar installation crew working on a residential roof',
  },
] as const;

export function ProcessSteps({ id = 'process' }: { id?: string }) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <Container>
        <SectionHeading
          id={`${id}-title`}
          eyebrow="Three clear steps"
          title="How installation works"
          description="From the first conversation to utility interconnection, each step makes the work easier to understand."
        />
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li
              className={`${styles.step} ${index % 2 === 1 ? styles.reverse : ''}`}
              key={step.number}
            >
              <div className={styles.media}>
                <Image
                  src={step.media}
                  alt={step.alt}
                  width={1448}
                  height={1086}
                  className={styles.mediaImage}
                  sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1440px) 48vw, 665px"
                />
              </div>
              <div className={styles.copy}>
                <span className={styles.number}>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
