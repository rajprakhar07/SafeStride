/**
 * Input/index.tsx — F-06
 * Reusable input component used across all screens.
 */

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
        {label && (
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{
            width:        '100%',
            padding:      '0.8rem 1rem',
            fontSize:     '1rem',
            border:       `1.5px solid ${error ? '#E91E8C' : '#e0e0e0'}`,
            borderRadius: '12px',
            outline:      'none',
            boxSizing:    'border-box',
            fontFamily:   "'Inter', system-ui, sans-serif",
            background:   props.disabled ? '#f9f9f9' : '#fff',
            color:        '#1a1a1a',
            ...style,
          }}
          {...props}
        />
        {error && (
          <p style={{ fontSize: '0.8rem', color: '#E91E8C', margin: 0 }}>{error}</p>
        )}
        {hint && !error && (
          <p style={{ fontSize: '0.8rem', color: '#aaa', margin: 0 }}>{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;