/**
 * JourneyCard.tsx — F-14
 * Reusable card for displaying journey info with deviation alert state.
 * Used in journey history and active journey overlays.
 */

import type { JourneyHistoryItem } from '../../services/api/journey.api';

interface JourneyCardProps {
  journey:        JourneyHistoryItem;
  hasDeviation?:  boolean;
  onClick?:       () => void;
}

function formatDuration(start: string, end?: string): string {
  if (!end) return '—';
  const ms   = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  completed:     { icon: '✅', label: 'Safe arrival',  color: '#065F46', bg: '#D1FAE5' },
  sos_triggered: { icon: '🚨', label: 'SOS triggered', color: '#991B1B', bg: '#FEE2E2' },
  alert_sent:    { icon: '⚠️', label: 'Alert sent',    color: '#92400E', bg: '#FEF3C7' },
  cancelled:     { icon: '✕',  label: 'Cancelled',     color: '#6B7280', bg: '#F3F4F6' },
};

const TRANSPORT_ICONS: Record<string, string> = {
  walking: '🚶', auto: '🛺', cab: '🚗', bus: '🚌', mixed: '🔄',
};

export default function JourneyCard({ journey, hasDeviation = false, onClick }: JourneyCardProps) {
  const st = STATUS_CONFIG[journey.status] || STATUS_CONFIG.completed;

  return (
    <div
      style={{
        ...styles.card,
        cursor:    onClick ? 'pointer' : 'default',
        borderColor: hasDeviation ? '#F59E0B' : '#f0f0f0',
        borderWidth: hasDeviation ? '1.5px' : '1px',
      }}
      onClick={onClick}
    >
      {/* Deviation warning */}
      {hasDeviation && (
        <div style={styles.deviationTag}>
          ⚠️ Route deviation recorded
        </div>
      )}

      {/* Top row */}
      <div style={styles.topRow}>
        <div style={styles.destInfo}>
          <div style={styles.dest}>
            {journey.plannedDestination.formattedAddress || 'Journey'}
          </div>
          <div style={styles.time}>{formatDate(journey.createdAt)}</div>
        </div>
        <span style={{ ...styles.badge, color: st.color, background: st.bg }}>
          {st.icon} {st.label}
        </span>
      </div>

      {/* Meta row */}
      <div style={styles.metaRow}>
        <span>{TRANSPORT_ICONS[journey.transportMode] || '🚶'} {journey.transportMode}</span>
        <span>⏱ {formatDuration(journey.createdAt, journey.actualArrival)}</span>
        {journey.actualArrival && (
          <span>🏁 {new Date(journey.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card:         { background: '#fff', borderRadius: '14px', padding: '1rem 1.25rem', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.6rem', transition: 'box-shadow 0.15s' },
  deviationTag: { background: '#FEF3C7', color: '#92400E', fontSize: '0.78rem', fontWeight: 600, padding: '0.3rem 0.6rem', borderRadius: '8px', alignSelf: 'flex-start' },
  topRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' },
  destInfo:     { flex: 1, minWidth: 0 },
  dest:         { fontWeight: 600, fontSize: '0.95rem', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  time:         { fontSize: '0.78rem', color: '#aaa', marginTop: '2px' },
  badge:        { padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' },
  metaRow:      { display: 'flex', gap: '1rem', fontSize: '0.82rem', color: '#888', flexWrap: 'wrap' },
};