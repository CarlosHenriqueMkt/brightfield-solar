import styles from './MediaPlaceholder.module.css';

export function MediaPlaceholder({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`${styles.placeholder} ${className}`}
      role="img"
      aria-label={`${label}. Image pending permission.`}
    >
      <span aria-hidden="true">
        {label}
        <br />
        Image pending permission
      </span>
    </div>
  );
}
