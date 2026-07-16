import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore }    from '../../store/authStore';
import { useJourneyStore } from '../../store/journeyStore';
import { getActiveJourney, getJourneyHistory, type JourneyHistoryItem } from '../../services/api/journey.api';
import VoiceButton from '../../components/common/VoiceButton';

export default function Home() {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);
  const { setActiveJourney, activeJourney } = useJourneyStore((s) => ({
    setActiveJourney: s.setActiveJourney,
    activeJourney:    s.activeJourney,
  }));

  const [recentJourneys, setRecentJourneys] = useState<JourneyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const active = await getActiveJourney();
        if (active) setActiveJourney(active);
        const history = await getJourneyHistory();
        setRecentJourneys(history.slice(0, 3));
      } catch { }
      finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>{greeting()},</p>
          <h1 style={styles.name}>{user?.name || 'Stay Safe'} 👋</h1>
        </div>
        <button style={styles.menuBtn} onClick={() => navigate('/contacts')}>👥</button>
      </div>

      {activeJourney && (
        <div style={styles.activeBanner} onClick={() => navigate('/journey/active')}>
          <div style={styles.activeDot} />
          <div>
            <div style={styles.activeTitle}>Journey in progress</div>
            <div style={styles.activeSub}>→ {activeJourney.plannedDestination.formattedAddress || 'Destination'}</div>
          </div>
          <span style={styles.activeArrow}>›</span>
        </div>
      )}

      <div style={styles.ctaCard}>
        <div style={styles.ctaIcon}>🛡️</div>
        <h2 style={styles.ctaTitle}>Start a Journey</h2>
        <p style={styles.ctaText}>
          Your guardian will silently monitor your route and alert your contacts if needed.
        </p>
        <button style={styles.ctaBtn} onClick={() => navigate('/journey/start')}>
          Start Guardian Mode →
        </button>
        <VoiceButton />
      </div>

      <div style={styles.quickActions}>
        {[
          { icon: '👥', label: 'Contacts',   path: '/contacts'        },
          { icon: '📍', label: 'Danger Map',  path: '/community'       },
          { icon: '🕐', label: 'History',     path: '/journey/history' },
          { icon: '⚙️', label: 'Settings',   path: '/settings'        },
        ].map((a) => (
          <button key={a.path} style={styles.quickBtn} onClick={() => navigate(a.path)}>
            <span style={styles.quickIcon}>{a.icon}</span>
            <span style={styles.quickLabel}>{a.label}</span>
          </button>
        ))}
      </div>

      {!loading && recentJourneys.length > 0 && (
        <div style={styles.recentSection}>
          <div style={styles.recentHeader}>
            <span style={styles.recentTitle}>Recent Journeys</span>
            <button style={styles.seeAll} onClick={() => navigate('/journey/history')}>See all →</button>
          </div>
          {recentJourneys.map((j) => (
            <div key={j._id} style={styles.recentItem}>
              <span style={styles.recentIcon}>{j.status === 'completed' ? '✅' : '⚠️'}</span>
              <div style={styles.recentInfo}>
                <div style={styles.recentDest}>{j.plannedDestination.formattedAddress || 'Journey'}</div>
                <div style={styles.recentTime}>{new Date(j.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:    { minHeight: '100dvh', padding: '1.5rem', background: '#f9f9f9', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' },
  greeting:     { fontSize: '0.9rem', color: '#888', margin: '0 0 2px' },
  name:         { fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' },
  menuBtn:      { background: '#fff', border: 'none', borderRadius: '12px', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  activeBanner: { background: '#E91E8C', borderRadius: '14px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' },
  activeDot:    { width: '10px', height: '10px', borderRadius: '50%', background: '#fff', flexShrink: 0 },
  activeTitle:  { color: '#fff', fontWeight: 600, fontSize: '0.9rem' },
  activeSub:    { color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' },
  activeArrow:  { color: '#fff', fontSize: '1.5rem', marginLeft: 'auto' },
  ctaCard:      { background: '#fff', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' },
  ctaIcon:      { fontSize: '2.5rem' },
  ctaTitle:     { fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', margin: 0 },
  ctaText:      { fontSize: '0.88rem', color: '#888', margin: 0, lineHeight: 1.5 },
  ctaBtn:       { marginTop: '0.5rem', padding: '0.85rem 2rem', background: '#E91E8C', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', width: '100%' },
  quickActions: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' },
  quickBtn:     { background: '#fff', border: 'none', borderRadius: '14px', padding: '0.85rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  quickIcon:    { fontSize: '1.3rem' },
  quickLabel:   { fontSize: '0.72rem', color: '#555', fontWeight: 500 },
  recentSection:{ background: '#fff', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  recentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  recentTitle:  { fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a' },
  seeAll:       { background: 'none', border: 'none', color: '#E91E8C', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  recentItem:   { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f5f5f5' },
  recentIcon:   { fontSize: '1.1rem', flexShrink: 0 },
  recentInfo:   { flex: 1, minWidth: 0 },
  recentDest:   { fontSize: '0.88rem', fontWeight: 500, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  recentTime:   { fontSize: '0.78rem', color: '#aaa' },
};