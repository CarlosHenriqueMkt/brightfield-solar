import { Container } from '@/components/ui/Container';
import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { SectionHeading } from '@/components/ui/SectionHeading';
import styles from './ProcessSteps.module.css';

const steps = [
  {
    number: '01',
    title: 'Assess your home',
    copy: 'A home assessment helps clarify your roof and the work involved.',
    media: 'Assessment',
  },
  {
    number: '02',
    title: 'Plan the work',
    copy: 'Review the proposed system and the permit process before installation.',
    media: 'Planning',
  },
  {
    number: '03',
    title: 'Install and connect',
    copy: 'Follow the steps from installation to utility interconnection.',
    media: 'Installation',
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
              <MediaPlaceholder label={step.media} className={styles.media} />
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
