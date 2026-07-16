/**
 * VoiceButton.tsx — F-27
 * Mic button for the Home screen that activates voice assistant.
 */

import { useVoiceAssistant, type VoiceState } from '../../hooks/useVoiceAssistant';

const STATE_CONFIG: Record<VoiceState, { icon: string; label: string; bg: string }> = {
  idle:       { icon: '🎤', label: 'Tap to speak', bg: '#fff' },
  listening:  { icon: '🔴', label: 'Listening…',  bg: '#FEE2E2' },
  processing: { icon: '⚡', label: 'Processing…', bg: '#FEF3C7' },
  error:      { icon: '❌', label: 'Try again',   bg: '#FEE2E2' },
};

export default function VoiceButton() {
  const { voiceState, transcript, isSupported, startListening, stopListening } = useVoiceAssistant();

  if (!isSupported) return null;

  const cfg = STATE_CONFIG[voiceState];

  return (
    <div style={styles.container}>
      <button
        style={{ ...styles.btn, background: cfg.bg }}
        onClick={voiceState === 'listening' ? stopListening : startListening}
        aria-label="Voice command"
      >
        <span style={styles.icon}>{cfg.icon}</span>
      </button>
      <span style={styles.label}>{cfg.label}</span>
      {transcript && voiceState === 'processing' && (
        <span style={styles.transcript}>"{transcript}"</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  btn:       { width: '56px', height: '56px', borderRadius: '50%', border: '1.5px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.2s' },
  icon:      { fontSize: '1.4rem' },
  label:     { fontSize: '0.68rem', color: '#aaa', textAlign: 'center' },
  transcript:{ fontSize: '0.72rem', color: '#E91E8C', fontStyle: 'italic', maxWidth: '120px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};