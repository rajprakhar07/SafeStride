/**
 * SOSButton.tsx — F-21
 * Large SOS button with 3-second hold-to-trigger and visual countdown.
 * Designed for one-hand operation in emergencies.
 */

import { useSOSStore } from '../../store/sosStore';
import { useSOS }      from '../../hooks/useSOS';

export default function SOSButton() {
  const { isCountingDown, countdownSeconds } = useSOSStore();
  const { startHold, cancelHold } = useSOS();

  // Prevent context menu on long press (mobile)
  function handleContextMenu(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
  }

  return (
    <div style={styles.wrapper}>
      {isCountingDown && (
        <div style={styles.countdownRing}>
          <svg viewBox="0 0 100 100" style={styles.svg}>
            <circle cx="50" cy="50" r="44" fill="none" stroke="#FEE2E2" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke="#E91E8C"
              strokeWidth="8"
              strokeDasharray={`${((3 - countdownSeconds) / 3) * 276} 276`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.9s linear' }}
            />
          </svg>
          <div style={styles.countdownNum}>{countdownSeconds}</div>
        </div>
      )}

      <button
        style={{
          ...styles.btn,
          transform:  isCountingDown ? 'scale(0.95)' : 'scale(1)',
          boxShadow:  isCountingDown
            ? '0 0 0 8px rgba(233,30,140,0.3), 0 0 0 16px rgba(233,30,140,0.1)'
            : '0 4px 20px rgba(233,30,140,0.4)',
        }}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onContextMenu={handleContextMenu}
        aria-label="SOS Emergency Button — Hold for 3 seconds to trigger"
      >
        <span style={styles.icon}>🆘</span>
        <span style={styles.label}>SOS</span>
        <span style={styles.hint}>
          {isCountingDown ? 'Hold…' : 'Hold 3 sec'}
        </span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:       { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px' },
  countdownRing: { position: 'absolute', inset: '-10px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  svg:           { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  countdownNum:  { position: 'relative', fontSize: '2rem', fontWeight: 900, color: '#E91E8C', zIndex: 2 },
  btn: {
    width:          '120px',
    height:         '120px',
    borderRadius:   '50%',
    background:     'linear-gradient(135deg, #E91E8C 0%, #B01067 100%)',
    border:         '4px solid #fff',
    color:          '#fff',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '2px',
    cursor:         'pointer',
    transition:     'transform 0.15s, box-shadow 0.15s',
    userSelect:     'none',
    WebkitUserSelect: 'none',
    position:       'relative',
    zIndex:         2,
  },
  icon:  { fontSize: '1.75rem', lineHeight: 1 },
  label: { fontSize: '1rem', fontWeight: 900, letterSpacing: '0.1em' },
  hint:  { fontSize: '0.65rem', opacity: 0.85, fontWeight: 500 },
};