/**
 * SOSStatus.tsx
 * Full-screen overlay shown when SOS is active.
 */

import { useSOSStore } from '../../store/sosStore';
import { resolveSOS } from '../../services/api/sos.api';
import Button from '../common/Button';

export default function SOSStatus() {
  const { sosEvent, clearSOS } = useSOSStore((s) => ({
    sosEvent: s.sosEvent,
    clearSOS: s.clearSOS
  }));

  const handleCancel = async () => {
    if (!sosEvent) {
      clearSOS();
      return;
    }
    try {
      await resolveSOS(sosEvent._id, 'User cancelled SOS');
      clearSOS();
    } catch (err) {
      console.error('Failed to cancel SOS:', err);
      clearSOS(); // Clear locally anyway
    }
  };

  if (!sosEvent) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.iconBox}>🚑</div>
        <h1 style={styles.title}>Help is coming</h1>
        <p style={styles.subtitle}>Your trusted contacts have been alerted</p>

        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.label}>SOS triggered at</span>
            <span style={styles.value}>
              {new Date(sosEvent.triggerTimestamp).toLocaleTimeString()}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Location</span>
            <span style={styles.value}>
              {sosEvent.location.lat.toFixed(4)}, {sosEvent.location.lng.toFixed(4)}
            </span>
          </div>
        </div>

        <p style={styles.alertNote}>
          📱 SMS and WhatsApp alerts have been sent. They can see your live location via the portal link.
        </p>

        <Button 
          fullWidth 
          onClick={handleCancel}
          style={{ background: '#22C55E', marginTop: '1rem' }}
        >
          ✅ I'm Safe — Cancel SOS
        </Button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999, background: '#E91E8C',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
  },
  content: {
    background: '#fff', borderRadius: '24px', padding: '2rem', width: '100%',
    maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
  },
  iconBox: { fontSize: '4rem', marginBottom: '1rem' },
  title: { fontSize: '1.75rem', fontWeight: 800, color: '#1a1a1a', margin: '0 0 0.5rem' },
  subtitle: { fontSize: '1rem', color: '#666', marginBottom: '2rem' },
  infoBox: { 
    background: '#f9f9f9', borderRadius: '16px', padding: '1.25rem', 
    display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' 
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' },
  label: { color: '#888' },
  value: { fontWeight: 700, color: '#1a1a1a' },
  alertNote: { fontSize: '0.85rem', color: '#888', lineHeight: 1.5, marginBottom: '1.5rem' }
};

