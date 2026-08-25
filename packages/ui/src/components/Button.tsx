'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Yuklanma holati — aria-busy bilan belgilanadi va bosish o'chiriladi. */
  loading?: boolean;
  /** Lucide ikona — faqat lucide-react ruxsat etilgan (§8.1). */
  icon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bil-btn--primary',
  secondary: 'bil-btn--secondary',
  ghost: 'bil-btn--ghost',
  danger: 'bil-btn--danger',
};

/**
 * Bazaviy Button — §8.3 deliverables ro'yxatidan birinchi primitive.
 * Keyboard fokus ringi global :focus-visible orqali accent rangda beriladi.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, disabled, className, children, type, ...rest },
  ref,
) {
  const classes = ['bil-btn', `bil-btn--${size}`, variantClass[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle size={16} aria-hidden="true" className="bil-btn__spinner" /> : icon}
      {children}
    </button>
  );
});
