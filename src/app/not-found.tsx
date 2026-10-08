import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <p>
        <strong>Brightfield Solar</strong>
      </p>
      <h1>Page not available</h1>
      <p>
        The institutional homepage is outside this demonstration. The requested
        page is not available.
      </p>
      <Link className={styles.recoveryLink} href="/city/phoenix-az">
        Explore the Phoenix solar demonstration
      </Link>
    </main>
  );
}
