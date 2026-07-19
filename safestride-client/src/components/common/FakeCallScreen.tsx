/**
 * FakeCallScreen.tsx — F-29
 * Full-screen incoming call overlay.
 * Shown when fake call is active.
 * Mimics a real phone call UI.
 */

import { useEffect, useState } from 'react';

interface FakeCallScreenProps {
  callerName: string;
  isAnswered: boolean;
  onAnswer:   () => void;
  onEnd:      () => void;
}

export default function FakeCallScreen({
  callerName,
  isAnswered,
  onAnswer,
  onEnd,
}: FakeCallScreenProps) {
  const [callDuration, setCallDuration] = useState(0);

  // Timer for call duration when answered
  useEffect(() => {
    if (!isAnswered) { setCallDuration(0); return; }
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [isAnswered]);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Prevent accidental closing
  function handleOverlayClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      {/* Status bar simulation */}
      <div style={styles.statusBar}>
        <span style={styles.time}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span style={styles.signal}>●●●</span>
      </div>

      {/* Call header */}
      <div style={styles.callType}>
        {isAnswered ? '📞 On a call' : '📱 Incoming call'}
      </div>

      {/* Caller info */}
      <div style={styles.callerSection}>
        <div style={styles.avatarRing}>
          <div style={styles.avatar}>
            {callerName.charAt(0).toUpperCase()}
          </div>
        </div>
        <h1 style={styles.callerName}>{callerName}</h1>
        <p style={styles.callerSub}>Mobile · India</p>
        {isAnswered && (
          <p style={styles.duration}>{formatDuration(callDuration)}</p>
        )}
        {!isAnswered && (
          <p style={styles.ringing}>Ringing…</p>
        )}
      </div>

      {/* Action buttons */}
      {!isAnswered ? (
        // Incoming call — decline and answer
        <div style={styles.incomingActions}>
          {/* Quick actions */}
          <div style={styles.quickRow}>
            <div style={styles.quickAction}>
              <div style={styles.quickBtn}>🔇</div>
              <span style={styles.quickLabel}>Mute</span>
            </div>
            <div style={styles.quickAction}>
              <div style={styles.quickBtn}>💬</div>
              <span style={styles.quickLabel}>Message</span>
            </div>
            <div style={styles.quickAction}>
              <div style={styles.quickBtn}>⏰</div>
              <span style={styles.quickLabel}>Remind</span>
            </div>
          </div>

          {/* Decline + Answer */}
          <div style={styles.mainActions}>
            <div style={styles.actionItem}>
              <button style={styles.declineBtn} onClick={onEnd}>
                <span style={styles.actionIcon}>📵</span>
              </button>
              <span style={styles.actionLabel}>Decline</span>
            </div>
            <div style={styles.actionItem}>
              <button style={styles.answerBtn} onClick={onAnswer}>
                <span style={styles.actionIcon}>📞</span>
              </button>
              <span style={styles.actionLabel}>Accept</span>
            </div>
          </div>
        </div>
      ) : (
        // Active call — call controls
        <div style={styles.activeActions}>
          <div style={styles.controlsGrid}>
            {[
              { icon: '🔇', label: 'Mute'      },
              { icon: '🔊', label: 'Speaker'   },
              { icon: '➕', label: 'Add call'  },
              { icon: '⌨️', label: 'Keypad'    },
              { icon: '📳', label: 'Hold'      },
              { icon: '📹', label: 'FaceTime'  },
            ].map((btn) => (
              <div key={btn.label} style={styles.controlItem}>
                <div style={styles.controlBtn}>{btn.icon}</div>
                <span style={styles.controlLabel}>{btn.label}</span>
              </div>
            ))}
          </div>

          <div style={styles.actionItem}>
            <button style={styles.endCallBtn} onClick={onEnd}>
              <span style={styles.actionIcon}>📵</span>
            </button>
            <span style={styles.actionLabel}>End</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay:        { position: 'fixed', inset: 0, background: 'linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 99999, fontFamily: "-apple-system, 'SF Pro Display', 'Inter', sans-serif", userSelect: 'none' },
  statusBar:      { width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' },
  time:           { fontWeight: 600 },
  signal:         { letterSpacing: '-2px', fontSize: '0.6rem', marginTop: '4px' },
  callType:       { fontSize: '0.85rem', color: '#22C55E', fontWeight: 600, marginTop: '0.5rem', letterSpacing: '0.02em' },
  callerSection:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', paddingBottom: '2rem' },
  avatarRing:     { padding: '6px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', animation: 'avatarPulse 2s infinite' },
  avatar:         { width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #E91E8C, #B01067)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, color: '#fff' },
  callerName:     { fontSize: '2.2rem', fontWeight: 300, color: '#fff', margin: 0, letterSpacing: '-0.02em' },
  callerSub:      { fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', margin: 0 },
  ringing:        { fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', margin: 0, animation: 'fadeInOut 1.5s infinite' },
  duration:       { fontSize: '1.1rem', color: '#22C55E', fontWeight: 500, margin: 0 },
  incomingActions:{ width: '100%', padding: '0 1.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem' },
  quickRow:       { display: 'flex', justifyContent: 'space-around' },
  quickAction:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  quickBtn:       { width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' },
  quickLabel:     { fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' },
  mainActions:    { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  actionItem:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' },
  actionLabel:    { fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' },
  declineBtn:     { width: '72px', height: '72px', borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  answerBtn:      { width: '72px', height: '72px', borderRadius: '50%', background: '#22C55E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionIcon:     { fontSize: '1.75rem' },
  activeActions:  { width: '100%', padding: '0 1.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center' },
  controlsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', width: '100%' },
  controlItem:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  controlBtn:     { width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' },
  controlLabel:   { fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' },
  endCallBtn:     { width: '72px', height: '72px', borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};