/**
 * Home.tsx — Redesigned Version
 * Professional, clean UI with a sleek Active Journey banner.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore }    from '../../store/authStore';
import { useJourneyStore } from '../../store/journeyStore';
import { getActiveJourney, getJourneyHistory, type JourneyHistoryItem } from '../../services/api/journey.api';
import VoiceButton from '../../components/common/VoiceButton';
import FakeCallScreen from '../../components/common/FakeCallScreen';
import { useFakeCall } from '../../hooks/useFakeCall';

export default function Home() {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);
  const { setActiveJourney, activeJourney } = useJourneyStore((s) => ({
    setActiveJourney: s.setActiveJourney,
    activeJourney:    s.activeJourney,
  }));
  const { isCallActive, isAnswered, callerName, startFakeCall, answerCall, endCall } = useFakeCall();

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
      {/* Fake call overlay */}
      {isCallActive && (
        <FakeCallScreen
          callerName={callerName}
          isAnswered={isAnswered}
          onAnswer={answerCall}
          onEnd={endCall}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>{greeting()},</p>
          <h1 style={styles.name}>{user?.name || 'Stay Safe'} 👋</h1>
        </div>
        <button style={styles.profileBtn} onClick={() => navigate('/contacts')}>
          👥
        </button>
      </div>

      {/* Sleek Active Journey Banner */}
      {activeJourney && (
        <div style={styles.activeBanner} onClick={() => navigate('/journey/active')}>
          <div style={styles.activeDot} />
          <div style={{ flex: 1 }}>
            <div style={styles.activeTitle}>Journey in progress</div>
            <div style={styles.activeSub}>→ {activeJourney.plannedDestination.formattedAddress || 'Destination'}</div>
          </div>
          <span style={styles.activeArrow}>›</span>
        </div>
      )}

      {/* Main Action Card */}
      <div style={styles.ctaCard}>
        <div style={styles.ctaIcon}>🛡️</div>
        <h2 style={styles.ctaTitle}>Start a Journey</h2>
        <p style={styles.ctaText}>Your guardian will silently monitor your route and alert your contacts if needed.</p>
        <button style={styles.ctaBtn} onClick={() => navigate('/journey/start')}>
          Start Guardian Mode →
        </button>
        <div style={{ marginTop: '1rem' }}>
          <VoiceButton />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div style={styles.quickActions}>
        {[
          { icon: '👥', label: 'Contacts',   path: '/contacts',      bg: '#f0fdf4' },
          { icon: '📍', label: 'Safety Map', path: '/community',     bg: '#eef2ff' },
          { icon: '🕐', label: 'History',    path: '/journey/history', bg: '#fff7ed' },
          { icon: '🔒', label: 'Route Check', path: '/route-planner',  bg: '#f5f3ff' },
        ].map((a) => (
          <button key={a.path} style={styles.quickBtn} onClick={() => navigate(a.path)}>
            <div style={{ ...styles.quickIconBox, background: a.bg }}>{a.icon}</div>
            <span style={styles.quickLabel}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Fake Call Quick Trigger */}
      <button style={styles.fakeCallBtn} onClick={startFakeCall}>
        📞 Start Fake Call
      </button>

      {/* Recent Activity */}
      {!loading && recentJourneys.length > 0 && (
        <div style={styles.recentSection}>
          <div style={styles.recentHeader}>
            <span style={styles.recentTitle}>Recent Activity</span>
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
  container:    { minHeight: '100dvh', padding: '1.5rem', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  greeting:     { fontSize: '0.9rem', color: '#888', margin: 0 },
  name:         { fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' },
  profileBtn:   { background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  // Sleek Active Banner
  activeBanner: { background: '#1a1a1a', borderRadius: '16px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' },
  activeDot:    { width: '10px', height: '10px', borderRadius: '50%', background: '#E91E8C', boxShadow: '0 0 0 4px rgba(233,30,140,0.2)', animation: 'pulse 1.5s infinite' },
  activeTitle:  { color: '#E91E8C', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  activeSub:    { color: '#fff', fontSize: '0.95rem', fontWeight: 500, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  activeArrow:  { color: '#fff', fontSize: '1.2rem', opacity: 0.5 },

  ctaCard:      { background: '#fff', borderRadius: '24px', padding: '2rem', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' },
  ctaIcon:      { fontSize: '3rem', marginBottom: '0.5rem' },
  ctaTitle:     { fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', margin: 0 },
  ctaText:      { fontSize: '0.95rem', color: '#666', margin: 0, lineHeight: 1.5 },
  ctaBtn:       { marginTop: '0.5rem', padding: '1rem 2rem', background: '#E91E8C', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', width: '100%', boxShadow: '0 10px 25px rgba(233,30,140,0.2)' },
  
  quickActions: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' },
  quickBtn:     { background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' },
  quickIconBox: { width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', transition: 'transform 0.2s' },
  quickLabel:   { fontSize: '0.75rem', color: '#444', fontWeight: 600 },
  
  fakeCallBtn:  { background: '#fef2f2', border: 'none', borderRadius: '16px', padding: '1rem', fontSize: '1rem', fontWeight: 700, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  
  recentSection:{ background: '#fff', borderRadius: '20px', padding: '1.25rem', border: '1px solid #f0f0f0' },
  recentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  recentTitle:  { fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' },
  seeAll:       { background: 'none', border: 'none', color: '#E91E8C', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' },
  recentItem:   { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f9f9f9' },
  recentIcon:   { fontSize: '1.2rem', flexShrink: 0 },
  recentInfo:   { flex: 1, minWidth: 0 },
  recentDest:   { fontSize: '0.9rem', fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  recentTime:   { fontSize: '0.8rem', color: '#888' },
};
