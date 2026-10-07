'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './CitySelector.module.css';

export interface CityOption {
  readonly slug: string;
  readonly label: string;
}

export function CitySelector({ options }: { options: readonly CityOption[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const slug = pathname.split('/')[2];

  return (
    <select
      className={styles.select}
      aria-label="Choose city"
      value={slug}
      onChange={(event) => {
        const destination = event.currentTarget.value;
        if (options.some((option) => option.slug === destination))
          router.push(`/city/${destination}`);
      }}
    >
      {options.map((option) => (
        <option key={option.slug} value={option.slug}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
