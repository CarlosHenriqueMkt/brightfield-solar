import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './FinalCTA.module.css';

type FinalCTAProps = {
  action: ReactNode;
  id?: string;
};

export function FinalCTA({ action, id = 'final-cta' }: FinalCTAProps) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.frame}>
        <div className={styles.media}>
          <Image
            src="/assets/approved-v2/closing-home.png"
            alt="A Phoenix home at blue hour"
            width={1672}
            height={941}
            className={styles.mediaImage}
            sizes="(max-width: 640px) 100vw, (max-width: 1440px) 90vw, 1296px"
          />
        </div>
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
