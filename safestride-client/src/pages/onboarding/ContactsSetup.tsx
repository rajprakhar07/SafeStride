/**
 * ContactsSetup.tsx — F-06
 * Onboarding Step 3: Shell only — full contact adding implemented in F-08.
 * Marks onboardingComplete = true and redirects to home.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../../services/api/user.api';
import Button from '../../components/common/Button';

export default function ContactsSetup() {
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);
    try {
      await updateProfile({ onboardingComplete: true });
    } catch {
      // Non-critical — continue anyway
    } finally {
      setLoading(false);
      navigate('/');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.progress}>
        <div style={{ ...styles.progressFill, width: '100%' }} />
      </div>
      <p style={styles.stepLabel}>Step 3 of 3</p>

      <div style={styles.icon}>👥</div>
      <h1 style={styles.title}>Add trusted contacts</h1>
      <p style={styles.subtitle}>
        These people will be notified if you don't reach your destination on time or if you trigger an SOS.
      </p>

      {/* Feature preview cards */}
      <div style={styles.featureList}>
        {[
          { icon: '📍', text: 'They see your live location during journeys' },
          { icon: '🚨', text: 'Instantly notified on SOS trigger' },
          { icon: '⏰', text: 'Alerted if you don\'t arrive on time' },
          { icon: '🔗', text: 'No app needed — works via a link' },
        ].map((f, i) => (
          <div key={i} style={styles.featureItem}>
            <span style={styles.featureIcon}>{f.icon}</span>
            <span style={styles.featureText}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={styles.note}>
        <span style={styles.noteIcon}>ℹ️</span>
        <span style={styles.noteText}>
          You can add up to 5 trusted contacts from Settings after setup.
        </span>
      </div>

      <Button fullWidth loading={loading} onClick={handleFinish} style={{ marginTop: '1.5rem' }}>
        Get started →
      </Button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:   { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto' },
  progress:    { width: '100%', height: '4px', background: '#f0f0f0', borderRadius: '2px', marginBottom: '0.5rem' },
  progressFill:{ height: '100%', background: '#E91E8C', borderRadius: '2px' },
  stepLabel:   { fontSize: '0.8rem', color: '#aaa', alignSelf: 'flex-start', margin: '0 0 1.5rem' },
  icon:        { fontSize: '3rem', marginBottom: '1rem' },
  title:       { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.5rem', textAlign: 'center', letterSpacing: '-0.02em' },
  subtitle:    { fontSize: '0.95rem', color: '#666', margin: '0 0 2rem', textAlign: 'center', lineHeight: 1.6 },
  featureList: { width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#fff0f6', borderRadius: '12px' },
  featureIcon: { fontSize: '1.25rem', flexShrink: 0 },
  featureText: { fontSize: '0.9rem', color: '#333' },
  note:        { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f5f5f5', borderRadius: '10px', width: '100%' },
  noteIcon:    { fontSize: '1rem', flexShrink: 0 },
  noteText:    { fontSize: '0.82rem', color: '#666', lineHeight: 1.5 },
};