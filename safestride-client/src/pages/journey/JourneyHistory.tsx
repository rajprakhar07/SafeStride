/**
 * JourneyHistory.tsx — F-12
 * List of past journeys with status and duration.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJourneyHistory, type JourneyHistoryItem } from '../../services/api/journey.api';

function formatDuration(start: string, end?: string): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  completed:     { bg: '#D1FAE5', color: '#065F46', label: '✅ Safe' },
  sos_triggered: { bg: '#FEE2E2', color: '#991B1B', label: '🚨 SOS' },
  cancelled:     { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
  alert_sent:    { bg: '#FEF3C7', color: '#92400E', label: '⚠ Alerted' },
};

export default function JourneyHistory() {
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<JourneyHistoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    getJourneyHistory()
      .then(setJourneys)
      .catch(() => setError('Failed to load journey history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
      <h1 style={styles.title}>Journey History</h1>

      {loading && <p style={styles.empty}>Loading…</p>}
      {error   && <p style={{ ...styles.empty, color: '#E91E8C' }}>{error}</p>}
      {!loading && !error && journeys.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem' }}>🗺️</div>
          <p style={styles.emptyText}>No journeys yet</p>
          <p style={styles.emptySubtext}>Your completed journeys will appear here.</p>
        </div>
      )}

      <div style={styles.list}>
        {journeys.map((j) => {
          const st = STATUS_STYLES[j.status] || STATUS_STYLES.completed;
          return (
            <div key={j._id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.cardInfo}>
                  <div style={styles.cardDest}>
                    {j.plannedDestination.formattedAddress || 'Journey'}
                  </div>
                  <div style={styles.cardTime}>{formatTime(j.createdAt)}</div>
                </div>
                <span style={{ ...styles.badge, background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              <div style={styles.cardMeta}>
                <span>🚶 {j.transportMode}</span>
                <span>⏱ {formatDuration(j.createdAt, j.actualArrival)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:   { minHeight: '100dvh', padding: '1.5rem', background: '#f9f9f9', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto' },
  back:        { background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0', marginBottom: '1rem' },
  title:       { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 1.5rem', letterSpacing: '-0.02em' },
  empty:       { textAlign: 'center', color: '#888', padding: '2rem', fontSize: '0.9rem' },
  emptyState:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '3rem 1rem', textAlign: 'center' },
  emptyText:   { fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: 0 },
  emptySubtext:{ fontSize: '0.88rem', color: '#888', margin: 0 },
  list:        { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card:        { background: '#fff', borderRadius: '14px', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' },
  cardInfo:    { flex: 1, minWidth: 0 },
  cardDest:    { fontWeight: 600, fontSize: '0.95rem', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardTime:    { fontSize: '0.8rem', color: '#888', marginTop: '2px' },
  badge:       { padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 },
  cardMeta:    { display: 'flex', gap: '1rem', fontSize: '0.82rem', color: '#888' },
};