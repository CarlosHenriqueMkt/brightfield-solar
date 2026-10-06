import styles from './SectionHeading.module.css';

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className={styles.heading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
    </header>
  );
}
