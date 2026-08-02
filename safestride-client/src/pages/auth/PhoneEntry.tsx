/**
 * PhoneEntry.tsx — F-04
 * Step 1 of auth: user enters phone number to receive OTP.
 *
 * Design: full-screen mobile, brand pink, clean single-field focus.
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { sendOTP } from '../../services/api/auth.api';

export default function PhoneEntry() {
  const navigate = useNavigate();

  // `phone` is kept in E.164 format (e.g. "+919876543210") by the library itself,
  // or `undefined` while the field is empty.
  const [phone,      setPhone]      = useState<string | undefined>(undefined);
  const [error,      setError]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const formatted = (phone ?? '').trim();
    if (!formatted || !isValidPhoneNumber(formatted)) {
      setError('Enter a valid phone number with country code e.g. +919876543210');
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP({ phone: formatted });
      // Navigate to OTP screen, pass phone via state
      navigate('/verify-otp', { state: { phone: formatted } });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Logo / Brand */}
      <div style={styles.brand}>
        <div style={styles.logoIcon}>🛡️</div>
        <h1 style={styles.appName}>SafeStride</h1>
        <p style={styles.tagline}>Walk alone. Never be alone.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label htmlFor="phone" style={styles.label}>
            Your mobile number
          </label>

          <PhoneInput
            id="phone"
            className="phone-entry-input"
            international
            defaultCountry="IN"
            countryCallingCodeEditable={false}
            placeholder="98765 43210"
            value={phone}
            onChange={(value) => { setPhone(value); setError(''); }}
            disabled={isLoading}
            autoFocus
            numberInputProps={{ autoComplete: 'tel' }}
          />

          {error && <p style={styles.errorText}>{error}</p>}
          <p style={styles.hint}>We'll send a 6-digit code to verify your number.</p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !phone}
          style={{
            ...styles.button,
            opacity: isLoading || !phone ? 0.6 : 1,
            cursor:  isLoading || !phone ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Sending…' : 'Send OTP →'}
        </button>
      </form>

      <p style={styles.footer}>
        By continuing, you agree to our Terms & Privacy Policy.
      </p>

      {/* Scoped styles to make react-phone-number-input visually match the
          previous plain <input>: same height, width, radius, border, font
          size, padding, and color scheme. */}
      <style>{`
        .phone-entry-input.PhoneInput {
          width: 100%;
          padding: 0.85rem 1rem;
          font-size: 1.1rem;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          box-sizing: border-box;
          transition: border-color 0.2s;
          background: #fff;
        }
        .phone-entry-input.PhoneInput--focus {
          border-color: #E91E8C;
        }
        .phone-entry-input .PhoneInputInput {
          border: none;
          outline: none;
          font-size: 1.1rem;
          font-family: inherit;
          color: inherit;
          background: transparent;
          width: 100%;
          padding: 0;
        }
        .phone-entry-input .PhoneInputCountry {
          margin-right: 0.6rem;
        }
        .phone-entry-input .PhoneInputCountryIcon {
          width: 1.4em;
          height: 1.4em;
          box-shadow: none;
        }
        .phone-entry-input .PhoneInputCountrySelectArrow {
          opacity: 0.6;
        }
        .phone-entry-input[disabled],
        .phone-entry-input.PhoneInput--disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight:      '100dvh',
    display:        'flex',
    flexDirection:  'column',
    justifyContent: 'center',
    alignItems:     'center',
    padding:        '2rem 1.5rem',
    background:     'linear-gradient(160deg, #fff0f6 0%, #ffffff 60%)',
    fontFamily:     "'Inter', system-ui, sans-serif",
  },
  brand: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  logoIcon: {
    fontSize:     '3rem',
    marginBottom: '0.5rem',
  },
  appName: {
    fontSize:   '2rem',
    fontWeight: 700,
    color:      '#B01067',
    margin:     '0 0 0.25rem',
    letterSpacing: '-0.03em',
  },
  tagline: {
    fontSize: '0.95rem',
    color:    '#888',
    margin:   0,
  },
  form: {
    width:     '100%',
    maxWidth:  '380px',
    display:   'flex',
    flexDirection: 'column',
    gap:       '1.25rem',
  },
  fieldGroup: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },
  label: {
    fontSize:   '0.85rem',
    fontWeight: 600,
    color:      '#333',
  },
  errorText: {
    fontSize: '0.82rem',
    color:    '#E91E8C',
    margin:   '0.25rem 0 0',
  },
  hint: {
    fontSize: '0.8rem',
    color:    '#aaa',
    margin:   0,
  },
  button: {
    width:        '100%',
    padding:      '0.9rem',
    fontSize:     '1rem',
    fontWeight:   600,
    color:        '#fff',
    background:   '#E91E8C',
    border:       'none',
    borderRadius: '12px',
    transition:   'opacity 0.2s',
  },
  footer: {
    marginTop: '2rem',
    fontSize:  '0.75rem',
    color:     '#bbb',
    textAlign: 'center',
  },
};