import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <h1>Page not found</h1>
      <p>The requested page is not available.</p>
      <Link href="/">Return to Brightfield Solar</Link>
    </main>
  );
}
