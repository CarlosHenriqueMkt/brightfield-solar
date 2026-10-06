import type { ReactNode } from 'react';
import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import styles from './FinalCTA.module.css';

type FinalCTAProps = {
  action: ReactNode;
  id?: string;
};

export function FinalCTA({ action, id = 'final-cta' }: FinalCTAProps) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.frame}>
        <MediaPlaceholder label="Home at blue hour" className={styles.media} />
        <div className={styles.copy}>
          <h2 id={`${id}-title`}>See the next step more clearly.</h2>
          <p>
            A home assessment helps turn an initial estimate into a clearer
            understanding of your home and the work involved.
          </p>
          {action}
        </div>
      </div>
    </section>
  );
}
