import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'light';
  arrow?: boolean;
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  arrow = true,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
      {arrow && <span aria-hidden="true">→</span>}
    </button>
  );
}
