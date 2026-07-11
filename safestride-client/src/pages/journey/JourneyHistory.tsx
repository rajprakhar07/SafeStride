import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJourneyHistory, type JourneyHistoryItem } from '../../services/api/journey.api';
import JourneyCard from '../../components/journey/JourneyCard';

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
      {error && <p style={{ ...styles.empty, color: '#E91E8C' }}>{error}</p>}

      {!loading && !error && journeys.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem' }}>🗺️</div>
          <p style={styles.emptyText}>No journeys yet</p>
          <p style={styles.emptySubtext}>Your completed journeys will appear here.</p>
        </div>
      )}

      <div style={styles.list}>
        {journeys.map((j) => (
          <JourneyCard
            key={j._id}
            journey={j}
            hasDeviation={(j as any).deviations?.length > 0}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:    { minHeight: '100dvh', padding: '1.5rem', background: '#f9f9f9', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto' },
  back:         { background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0', marginBottom: '1rem' },
  title:        { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 1.5rem', letterSpacing: '-0.02em' },
  empty:        { textAlign: 'center', color: '#888', padding: '2rem', fontSize: '0.9rem' },
  emptyState:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '3rem 1rem', textAlign: 'center' },
  emptyText:    { fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: 0 },
  emptySubtext: { fontSize: '0.88rem', color: '#888', margin: 0 },
  list:         { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
};