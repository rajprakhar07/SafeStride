/**
 * AdminDashboard.tsx — F-33 (Full Implementation)
 * A professional, data-driven dashboard for system administrators.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';

interface Stats {
  totalUsers: number;
  totalJourneys: number;
  totalSOS: number;
  activeDangerSpots: number;
  journeysToday: number;
  sosToday: number;
  dailyJourneys: { _id: string; count: number }[];
}

interface SOSEvent {
  _id: string;
  userName: string;
  triggeredBy: string;
  triggerTimestamp: string;
  resolvedAt: string | null;
  location: { lat: number; lng: number };
}

interface ActiveJourney {
  _id: string;
  userName: string;
  destination: string;
  startTime: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([]);
  const [activeJourneys, setActiveJourneys] = useState<ActiveJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'sos' | 'journeys'>('overview');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [s, e, j] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/sos-events?limit=20'),
        apiClient.get('/admin/active-journeys'),
      ]);
      setStats(s.data.data);
      setSosEvents(e.data.data.events);
      setActiveJourneys(j.data.data.journeys || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Access denied: Admin privileges required');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <p style={{color: '#666', fontSize: '0.9rem'}}>Loading Secure Dashboard...</p>
    </div>
  );

  if (error) return (
    <div style={styles.center}>
      <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🚫</div>
      <p style={{color:'#E91E8C', fontWeight: 600, textAlign: 'center'}}>{error}</p>
      <button style={styles.homeBtn} onClick={() => navigate('/')}>Return Home</button>
    </div>
  );

  const maxJ = Math.max(...(stats?.dailyJourneys.map(d => d.count) || [1]));

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
          <div style={styles.adminIcon}>🛡️</div>
          <div>
            <h1 style={styles.title}>SafeStride Admin</h1>
            <p style={styles.subtitle}>System Health & Security Monitor</p>
          </div>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/')}>Exit</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{...styles.tab, borderBottomColor: activeTab === 'overview' ? '#E91E8C' : 'transparent', color: activeTab === 'overview' ? '#E91E8C' : '#888'}} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={{...styles.tab, borderBottomColor: activeTab === 'sos' ? '#EF4444' : 'transparent', color: activeTab === 'sos' ? '#EF4444' : '#888'}} onClick={() => setActiveTab('sos')}>SOS Alerts {sosEvents.some(e => !e.resolvedAt) && '🔴'}</button>
        <button style={{...styles.tab, borderBottomColor: activeTab === 'journeys' ? '#10B981' : 'transparent', color: activeTab === 'journeys' ? '#10B981' : '#888'}} onClick={() => setActiveTab('journeys')}>Active Journeys</button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Quick Stats Grid */}
          <div style={styles.grid}>
            {[
              { label: 'Total Users',    value: stats?.totalUsers,        icon: '👥', color: '#3B82F6' },
              { label: 'Total Journeys', value: stats?.totalJourneys,     icon: '🗺️', color: '#8B5CF6' },
              { label: 'SOS Events',     value: stats?.totalSOS,          icon: '🚨', color: '#EF4444' },
              { label: 'Danger Spots',   value: stats?.activeDangerSpots, icon: '⚠️', color: '#F59E0B' },
              { label: 'Today Journeys', value: stats?.journeysToday,     icon: '📍', color: '#10B981' },
              { label: 'Today SOS',      value: stats?.sosToday,          icon: '🔴', color: '#EC4899' },
            ].map((m) => (
              <div key={m.label} style={{...styles.card, borderTop: '4px solid ' + m.color}}>
                <div style={{fontSize:'1.1rem'}}>{m.icon}</div>
                <div style={styles.val}>{m.value ?? 0}</div>
                <div style={styles.lbl}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Chart Section */}
          {stats?.dailyJourneys && stats.dailyJourneys.length > 0 && (
            <div style={styles.box}>
              <div style={styles.secHeader}>
                <span style={styles.secTitle}>Activity — Last 7 Days</span>
              </div>
              <div style={styles.chart}>
                {stats.dailyJourneys.map((d) => (
                  <div key={d._id} style={styles.barGroup}>
                    <div style={styles.barWrapper}>
                      <div style={{...styles.bar, height: Math.max(5,(d.count/maxJ)*100)+'%'}} />
                    </div>
                    <div style={styles.barLabel}>{d._id.slice(5)}</div>
                    <div style={styles.barCount}>{d.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'sos' && (
        <div style={styles.box}>
          <div style={styles.secTitle}>Recent SOS Incidents</div>
          {sosEvents.length === 0 ? (
            <p style={styles.emptyText}>No emergency events recorded.</p>
          ) : (
            <div style={styles.list}>
              {sosEvents.map((e) => (
                <div key={e._id} style={styles.row}>
                  <div style={{flex: 1}}>
                    <div style={styles.userName}>{e.userName}</div>
                    <div style={styles.metaText}>{e.triggeredBy.replace('_',' ')} · {new Date(e.triggerTimestamp).toLocaleString()}</div>
                    <div style={styles.locationText}>📍 {e.location.lat.toFixed(4)}, {e.location.lng.toFixed(4)}</div>
                  </div>
                  <span style={{...styles.badge, background: e.resolvedAt ? '#D1FAE5' : '#FEE2E2', color: e.resolvedAt ? '#065F46' : '#991B1B'}}>
                    {e.resolvedAt ? 'Resolved' : 'CRITICAL'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'journeys' && (
        <div style={styles.box}>
          <div style={styles.secTitle}>Currently Live Journeys</div>
          {activeJourneys.length === 0 ? (
            <p style={styles.emptyText}>No active journeys at the moment.</p>
          ) : (
            <div style={styles.list}>
              {activeJourneys.map((j) => (
                <div key={j._id} style={styles.row}>
                  <div style={{flex: 1}}>
                    <div style={styles.userName}>{j.userName}</div>
                    <div style={styles.metaText}>→ {j.destination}</div>
                    <div style={styles.locationText}>Started: {new Date(j.startTime).toLocaleTimeString()}</div>
                  </div>
                  <div style={styles.livePulse} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:  { minHeight:'100dvh', padding:'1.5rem', background:'#f8fafc', fontFamily:"'Inter',sans-serif", maxWidth:'800px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.5rem' },
  center:{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem', fontFamily:"'Inter',sans-serif" },
  spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #E91E8C', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  adminIcon: { fontSize: '2rem', background: '#fff', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  title: { fontSize:'1.25rem', fontWeight:800, color:'#0f172a', margin:0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.8rem', color: '#64748b', margin: 0 },
  backBtn: { background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'0.5rem 1rem', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' },
  homeBtn: { background:'#E91E8C', color:'#fff', border:'none', borderRadius:'8px', padding:'0.75rem 1.5rem', fontSize:'0.9rem', fontWeight:600, cursor:'pointer', marginTop: '1rem' },
  
  tabs: { display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' },
  tab: { background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '0.5rem 0.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },
  
  grid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' },
  card:  { background:'#fff', borderRadius:'16px', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.25rem', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  val:   { fontSize:'1.75rem', fontWeight:800, color:'#0f172a' },
  lbl:   { fontSize:'0.75rem', fontWeight: 600, color:'#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' },
  
  box:   { background:'#fff', borderRadius:'16px', padding:'1.5rem', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  secHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' },
  secTitle: { fontSize:'0.85rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' },
  
  chart: { display:'flex', gap:'0.75rem', alignItems:'flex-end', height:'120px', marginTop: '1rem' },
  barGroup:  { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', height:'100%' },
  barWrapper:  { flex:1, width:'100%', display:'flex', alignItems:'flex-end', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' },
  bar:   { width:'100%', background:'#E91E8C', borderRadius:'6px 6px 0 0', transition: 'height 0.5s ease-out' },
  barLabel:  { fontSize:'0.65rem', fontWeight: 600, color:'#94a3b8' },
  barCount:  { fontSize:'0.75rem', fontWeight:700, color:'#1e293b' },
  
  list: { display: 'flex', flexDirection: 'column' },
  row:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 0', borderBottom:'1px solid #f1f5f9', gap:'1rem' },
  userName:  { fontSize:'0.95rem', fontWeight:700, color:'#0f172a' },
  metaText:  { fontSize:'0.8rem', color:'#64748b', margin: '2px 0' },
  locationText: { fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' },
  badge: { padding:'0.3rem 0.75rem', borderRadius:'20px', fontSize:'0.7rem', fontWeight:800, textTransform: 'uppercase', letterSpacing: '0.03em' },
  emptyText: { color:'#94a3b8', textAlign:'center', fontSize:'0.85rem', padding: '2rem 0' },
  livePulse: { width: '10px', height: '10px', background: '#10B981', borderRadius: '50%', boxShadow: '0 0 0 rgba(16, 185, 129, 0.4)', animation: 'pulse-green 2s infinite' }
};

// Add keyframe animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse-green { 
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
`;
document.head.appendChild(styleSheet);
