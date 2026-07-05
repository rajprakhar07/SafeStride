/**
 * Button/index.tsx — F-06
 * Reusable button component used across all screens.
 */

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'ghost';
  size?:     'sm' | 'md' | 'lg';
  loading?:  boolean;
  fullWidth?: boolean;
}

export default function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display:       'inline-flex',
    alignItems:    'center',
    justifyContent:'center',
    gap:           '0.5rem',
    border:        'none',
    borderRadius:  '12px',
    fontFamily:    "'Inter', system-ui, sans-serif",
    fontWeight:    600,
    cursor:        disabled || loading ? 'not-allowed' : 'pointer',
    opacity:       disabled || loading ? 0.6 : 1,
    transition:    'opacity 0.2s, transform 0.1s',
    width:         fullWidth ? '100%' : undefined,
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '0.5rem 1rem',   fontSize: '0.85rem' },
    md: { padding: '0.8rem 1.25rem', fontSize: '1rem' },
    lg: { padding: '0.9rem 1.5rem', fontSize: '1.05rem' },
  };

  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: '#E91E8C', color: '#fff' },
    secondary: { background: '#f5f5f5', color: '#333' },
    ghost:     { background: 'transparent', color: '#E91E8C', border: '1.5px solid #E91E8C' },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}