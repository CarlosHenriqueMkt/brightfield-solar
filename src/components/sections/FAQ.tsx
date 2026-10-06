import type { CityConfig } from '@/domain/cities/city-config';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import styles from './FAQ.module.css';

type FAQItem = CityConfig['faq'][number];

type FAQProps = {
  items: CityConfig['faq'];
  id?: string;
  initiallyExpanded?: 'first' | 'all' | 'none';
};

export function FAQ({
  items,
  id = 'faq',
  initiallyExpanded = 'first',
}: FAQProps) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <Container>
        <div className={styles.wrap}>
          <SectionHeading
            id={`${id}-title`}
            eyebrow="Clear information"
            title="Your questions, answered"
          />
          <div className={styles.list}>
            {items.map((item: FAQItem, index) => {
              const open =
                initiallyExpanded === 'all' ||
                (initiallyExpanded === 'first' && index === 0);
              return (
                <details className={styles.item} key={item.q} open={open}>
                  <summary>
                    <span>{item.q}</span>
                    <span className={styles.sign} aria-hidden="true" />
                  </summary>
                  <div className={styles.answer}>
                    <p>{item.a}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
