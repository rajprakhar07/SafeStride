/**
 * AdminDashboard.tsx — F-31
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';

interface Stats {
  totalUsers: number; totalJourneys: number; totalSOS: number;
  activeDangerSpots: number; journeysToday: number; sosToday: number;
  dailyJourneys: { _id: string; count: number }[];
}

interface SOSEvent {
  _id: string; userName: string; triggeredBy: string;
  triggerTimestamp: string; resolvedAt: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, e] = await Promise.all([
          apiClient.get('/admin/stats'),
          apiClient.get('/admin/sos-events?limit=10'),
        ]);
        setStats(s.data.data);
        setSosEvents(e.data.data.events);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Access denied');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={c.center}>Loading dashboard...</div>;
  if (error)   return <div style={c.center}><p style={{color:'#E91E8C'}}>{error}</p><button onClick={() => navigate('/')}>Go Home</button></div>;

  const maxJ = Math.max(...(stats?.dailyJourneys.map(d => d.count) || [1]));

  return (
    <div style={c.page}>
      <div style={c.hdr}>
        <button style={c.back} onClick={() => navigate('/')}>Back</button>
        <h1 style={c.title}>Admin Dashboard</h1>
      </div>

      <div style={c.grid}>
        {[
          { label: 'Total Users',    value: stats?.totalUsers,        icon: '👥', color: '#3B82F6' },
          { label: 'Total Journeys', value: stats?.totalJourneys,     icon: '🗺️', color: '#8B5CF6' },
          { label: 'SOS Events',     value: stats?.totalSOS,          icon: '🚨', color: '#EF4444' },
          { label: 'Danger Spots',   value: stats?.activeDangerSpots, icon: '⚠️', color: '#F59E0B' },
          { label: 'Today Journeys', value: stats?.journeysToday,     icon: '📍', color: '#10B981' },
          { label: 'Today SOS',      value: stats?.sosToday,          icon: '🔴', color: '#EC4899' },
        ].map((m) => (
          <div key={m.label} style={{...c.card, borderTop: '3px solid ' + m.color}}>
            <div style={{fontSize:'1.25rem'}}>{m.icon}</div>
            <div style={c.val}>{m.value ?? 0}</div>
            <div style={c.lbl}>{m.label}</div>
          </div>
        ))}
      </div>

      {stats?.dailyJourneys && stats.dailyJourneys.length > 0 && (
        <div style={c.box}>
          <div style={c.sec}>Journeys — Last 7 Days</div>
          <div style={c.chart}>
            {stats.dailyJourneys.map((d) => (
              <div key={d._id} style={c.barG}>
                <div style={c.barW}>
                  <div style={{...c.bar, height: Math.max(4,(d.count/maxJ)*100)+'%'}} />
                </div>
                <div style={c.barL}>{d._id.slice(5)}</div>
                <div style={c.barC}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={c.box}>
        <div style={c.sec}>Recent SOS Events</div>
        {sosEvents.length === 0 ? (
          <p style={{color:'#aaa',textAlign:'center',fontSize:'0.85rem'}}>No SOS events</p>
        ) : sosEvents.map((e) => (
          <div key={e._id} style={c.row}>
            <div>
              <div style={c.user}>{e.userName}</div>
              <div style={c.meta}>{e.triggeredBy.replace('_',' ')} · {new Date(e.triggerTimestamp).toLocaleString()}</div>
            </div>
            <span style={{...c.badge, background: e.resolvedAt ? '#D1FAE5' : '#FEE2E2', color: e.resolvedAt ? '#065F46' : '#991B1B'}}>
              {e.resolvedAt ? 'Resolved' : 'Active'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const c: Record<string, React.CSSProperties> = {
  page:  { minHeight:'100dvh', padding:'1.5rem', background:'#f4f4f8', fontFamily:"'Inter',sans-serif", maxWidth:'600px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'1rem' },
  center:{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem', fontFamily:"'Inter',sans-serif" },
  hdr:   { display:'flex', alignItems:'center', gap:'1rem' },
  back:  { background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:'0.9rem' },
  title: { fontSize:'1.5rem', fontWeight:700, color:'#1a1a1a', margin:0 },
  grid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem' },
  card:  { background:'#fff', borderRadius:'14px', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.25rem', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  val:   { fontSize:'1.5rem', fontWeight:700, color:'#1a1a1a' },
  lbl:   { fontSize:'0.72rem', color:'#888' },
  box:   { background:'#fff', borderRadius:'14px', padding:'1rem 1.25rem', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  sec:   { fontSize:'0.82rem', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' },
  chart: { display:'flex', gap:'0.5rem', alignItems:'flex-end', height:'100px' },
  barG:  { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%' },
  barW:  { flex:1, width:'100%', display:'flex', alignItems:'flex-end' },
  bar:   { width:'100%', background:'#E91E8C', borderRadius:'4px 4px 0 0' },
  barL:  { fontSize:'0.65rem', color:'#aaa' },
  barC:  { fontSize:'0.72rem', fontWeight:600, color:'#333' },
  row:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid #f0f0f0', gap:'0.5rem' },
  user:  { fontSize:'0.88rem', fontWeight:600, color:'#1a1a1a' },
  meta:  { fontSize:'0.75rem', color:'#aaa' },
  badge: { padding:'0.2rem 0.6rem', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600, flexShrink:0 },
};