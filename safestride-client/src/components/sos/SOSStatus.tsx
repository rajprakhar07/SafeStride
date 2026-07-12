/**
 * SOSStatus.tsx — F-21
 * Full-screen overlay shown when SOS is active.
 * Shows "Help is coming" state + "I'm Safe" resolve button.
 */

import { useSOSStore }  from '../../store/sosStore';
import { useSOS }       from '../../hooks/useSOS';

export default function SOSStatus() {
  const { sosEvent } = useSOSStore();
  const { resolveSOSHandler } = useSOS();

  if (!sosEvent) return null;

  const triggeredAt = new Date(sosEvent.triggerTimestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div style={styles.overlay}>
      {/* Pulsing alert */}
      <div style={styles.alertCircle}>
        <span style={styles.alertIcon}>🚨</span>
      </div>

      <h1 style={styles.title}>Help is coming</h1>
      <p style={styles.subtitle}>Your trusted contacts have been alerted</p>

      {/* Details */}
      <div style={styles.detailCard}>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>SOS triggered at</span>
          <span style={styles.detailValue}>{triggeredAt}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Triggered by</span>
          <span style={styles.detailValue}>{sosEvent.triggeredBy.replace('_', ' ')}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Location</span>
          <span style={styles.detailValue}>
            {sosEvent.location.lat.toFixed(4)}, {sosEvent.location.lng.toFixed(4)}
          </span>
        </div>
      </div>

      <p style={styles.helpText}>
        📱 SMS and WhatsApp alerts have been sent to your contacts.{'\n'}
        They can see your live location via the portal link.
      </p>

      {/* Resolve button */}
      <button
        style={styles.safeBtn}
        onClick={() => resolveSOSHandler(sosEvent._id)}
      >
        ✅ I'm Safe — Cancel SOS
      </button>

      <p style={styles.cancelNote}>
        Only tap above if you are actually safe.
      </p>
    </div>
  );
}

const pulseStyle = `
  @keyframes sosPulse {
    0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(233,30,140,0.6); }
    70%  { transform: scale(1.05);box-shadow: 0 0 0 20px rgba(233,30,140,0); }
    100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(233,30,140,0); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  overlay:     { position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #FFF0F6 0%, #FFE0EE 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 9999, fontFamily: "'Inter', system-ui, sans-serif", gap: '1.25rem' },
  alertCircle: { width: '100px', height: '100px', borderRadius: '50%', background: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sosPulse 1.5s infinite' },
  alertIcon:   { fontSize: '2.5rem' },
  title:       { fontSize: '2rem', fontWeight: 900, color: '#B01067', margin: 0, letterSpacing: '-0.03em' },
  subtitle:    { fontSize: '1rem', color: '#72243E', margin: 0 },
  detailCard:  { background: '#fff', borderRadius: '16px', padding: '1rem 1.25rem', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: '0 2px 12px rgba(233,30,140,0.1)' },
  detailRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' },
  detailLabel: { fontSize: '0.82rem', color: '#aaa', fontWeight: 500 },
  detailValue: { fontSize: '0.88rem', color: '#1a1a1a', fontWeight: 600, textAlign: 'right' },
  helpText:    { fontSize: '0.85rem', color: '#72243E', textAlign: 'center', lineHeight: 1.6, maxWidth: '320px', whiteSpace: 'pre-line', margin: 0 },
  safeBtn:     { width: '100%', maxWidth: '360px', padding: '1rem', background: '#22C55E', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' },
  cancelNote:  { fontSize: '0.75rem', color: '#aaa', margin: 0 },
};

// Inject pulse animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseStyle;
  document.head.appendChild(style);
}