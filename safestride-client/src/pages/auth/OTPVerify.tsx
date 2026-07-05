/**
 * OTPVerify.tsx — F-04
 * Step 2 of auth: user enters 6-digit OTP.
 * 6 individual input boxes, auto-advance, auto-submit on last digit.
 */

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP } from '../../services/api/auth.api';
import { useAuthStore } from '../../store/authStore';

const OTP_LENGTH = 6;

export default function OTPVerify() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const setAuth   = useAuthStore((s) => s.setAuth);

  // Phone passed from PhoneEntry via navigate state
  const phone: string = (location.state as { phone?: string })?.phone || '';

  const [digits,     setDigits]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error,      setError]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Redirect back if no phone in state
  useEffect(() => {
    if (!phone) navigate('/login');
  }, [phone, navigate]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (digits.every((d) => d !== '')) {
      handleVerify(digits.join(''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1); // only last digit
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    // Advance focus
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  }

  async function handleVerify(otp: string) {
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await verifyOTP({ phone, otp });
      setAuth(result.accessToken, result.user);

      if (result.isNewUser || !result.onboardingComplete) {
        navigate('/onboarding/profile');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || 'Incorrect OTP. Please try again.');
      // Clear digits on error
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    try {
      const { sendOTP } = await import('../../services/api/auth.api');
      await sendOTP({ phone });
      setResendTimer(30);
      setDigits(Array(OTP_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend OTP. Please try again.');
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <button onClick={() => navigate('/login')} style={styles.backBtn}>← Back</button>

      <div style={styles.header}>
        <div style={styles.icon}>📱</div>
        <h1 style={styles.title}>Enter the code</h1>
        <p style={styles.subtitle}>
          We sent a 6-digit code to<br />
          <strong>{phone}</strong>
        </p>
      </div>

      {/* OTP boxes */}
      <div style={styles.otpRow} onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isLoading}
            style={{
              ...styles.otpBox,
              borderColor: error ? '#E91E8C' : digit ? '#E91E8C' : '#e0e0e0',
              background:  digit ? '#fff0f6' : '#fff',
            }}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {/* Error */}
      {error && <p style={styles.errorText}>{error}</p>}

      {/* Loading */}
      {isLoading && <p style={styles.loadingText}>Verifying…</p>}

      {/* Resend */}
      <div style={styles.resendRow}>
        <span style={styles.resendLabel}>Didn't receive it? </span>
        <button
          onClick={handleResend}
          disabled={resendTimer > 0}
          style={{
            ...styles.resendBtn,
            opacity: resendTimer > 0 ? 0.4 : 1,
            cursor:  resendTimer > 0 ? 'default' : 'pointer',
          }}
        >
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight:      '100dvh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    padding:        '1.5rem',
    background:     'linear-gradient(160deg, #fff0f6 0%, #ffffff 60%)',
    fontFamily:     "'Inter', system-ui, sans-serif",
  },
  backBtn: {
    alignSelf:    'flex-start',
    background:   'none',
    border:       'none',
    color:        '#888',
    fontSize:     '0.9rem',
    cursor:       'pointer',
    padding:      '0.5rem 0',
    marginBottom: '2rem',
  },
  header: {
    textAlign:    'center',
    marginBottom: '2rem',
  },
  icon: {
    fontSize:     '2.5rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize:      '1.75rem',
    fontWeight:    700,
    color:         '#1a1a1a',
    margin:        '0 0 0.5rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize:   '0.95rem',
    color:      '#666',
    lineHeight: 1.6,
    margin:     0,
  },
  otpRow: {
    display: 'flex',
    gap:     '0.6rem',
    marginBottom: '1rem',
  },
  otpBox: {
    width:        '48px',
    height:       '56px',
    textAlign:    'center',
    fontSize:     '1.4rem',
    fontWeight:   700,
    border:       '1.5px solid #e0e0e0',
    borderRadius: '12px',
    outline:      'none',
    transition:   'border-color 0.15s, background 0.15s',
  },
  errorText: {
    fontSize:  '0.85rem',
    color:     '#E91E8C',
    textAlign: 'center',
    margin:    '0.25rem 0 1rem',
  },
  loadingText: {
    fontSize: '0.85rem',
    color:    '#888',
    margin:   '0 0 1rem',
  },
  resendRow: {
    marginTop: '1.5rem',
    textAlign: 'center',
  },
  resendLabel: {
    fontSize: '0.85rem',
    color:    '#888',
  },
  resendBtn: {
    background: 'none',
    border:     'none',
    color:      '#E91E8C',
    fontWeight: 600,
    fontSize:   '0.85rem',
    padding:    0,
    transition: 'opacity 0.2s',
  },
};