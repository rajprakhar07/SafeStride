/**
 * ContactPortal.tsx — F-15
 * Trusted contact's view of a live journey.
 * Accessible via /portal/:token — no login required.
 * Connects to Socket.io /portal namespace for real-time updates.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import SafeMap   from '../../components/map/SafeMap';
import type { Coordinates } from '../../store/journeyStore';
const portalAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 15_000,
  withCredentials: true,
});

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
interface PortalData {
  contact:       { contactName: string; relationship?: string };
  user:          { name: string; profilePhoto?: string; phone: string };
  journey:       {
    _id:               string;
    status:            string;
    estimatedArrival:  string;
    transportMode:     string;
    plannedDestination: { coordinates: Coordinates; formattedAddress?: string };
    startLocation:     { coordinates: Coordinates };
    deviations:        unknown[];
  } | null;
  latestLocation: Coordinates | null;
  journeyId:     string | null;
}

export default function ContactPortal() {
  const { token } = useParams<{ token: string }>();

  const [portalData,     setPortalData]     = useState<PortalData | null>(null);
  const [liveLocation,   setLiveLocation]   = useState<Coordinates | null>(null);
  const [eta,            setEta]            = useState<string | null>(null);
  const [remainingMin,   setRemainingMin]   = useState<number | null>(null);
  const [journeyStatus,  setJourneyStatus]  = useState<string>('');
  const [deviationAlert, setDeviationAlert] = useState(false);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // ── Fetch portal data on load ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Invalid portal link'); setIsLoading(false); return; }

    portalAxios.get(`/portal/${token}`)
      .then(({ data }) => {
        const pd: PortalData = data.data;
        setPortalData(pd);
        setJourneyStatus(pd.journey?.status || 'none');
        if (pd.latestLocation) setLiveLocation(pd.latestLocation);
        if (pd.journey?.estimatedArrival) setEta(pd.journey.estimatedArrival);
      })
      .catch(() => setError('Invalid or expired portal link. Ask them to resend the invitation.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  // ── Connect to Socket.io /portal namespace ────────────────────────────────────
  useEffect(() => {
    if (!portalData?.journeyId || !token) return;

    const socket = io(`${SOCKET_URL}/portal`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('portal:join', { token, journeyId: portalData.journeyId });
    });

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('location:update', (data) => {
      setLiveLocation({ lat: data.lat, lng: data.lng });
      if (data.eta) setEta(data.eta);
      if (data.remainingMinutes) setRemainingMin(data.remainingMinutes);
    });

    socket.on('journey:ended', () => {
      setJourneyStatus('completed');
      setSocketConnected(false);
      socket.disconnect();
    });

    socket.on('journey:deviation', () => {
      setDeviationAlert(true);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [portalData?.journeyId, token]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const etaTime = eta
    ? new Date(eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  if (isLoading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner}>🛡️</div>
        <p style={styles.loadingText}>Loading portal…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <div style={{ fontSize: '2.5rem' }}>🔗</div>
        <h2 style={styles.errorTitle}>Invalid Link</h2>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!portalData) return null;

  const { user, journey } = portalData;
  const mapCenter = liveLocation ?? journey?.startLocation.coordinates ?? { lat: 18.5204, lng: 73.8567 };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>
            {user.profilePhoto
              ? <img src={user.profilePhoto} alt={user.name} style={styles.avatarImg} />
              : <span style={styles.avatarEmoji}>👤</span>
            }
          </div>
          <div>
            <div style={styles.userName}>{user.name}</div>
            <div style={styles.userPhone}>{user.phone}</div>
          </div>
        </div>
        <div style={{
          ...styles.statusBadge,
          background: journeyStatus === 'active' ? '#D1FAE5' : journeyStatus === 'completed' ? '#E0F2FE' : '#F3F4F6',
          color:      journeyStatus === 'active' ? '#065F46' : journeyStatus === 'completed' ? '#0369A1' : '#6B7280',
        }}>
          {journeyStatus === 'active' ? '🟢 Live' : journeyStatus === 'completed' ? '✅ Arrived' : '⚫ No journey'}
        </div>
      </div>

      {/* Deviation alert */}
      {deviationAlert && (
        <div style={styles.deviationBanner}>
          ⚠️ <strong>{user.name}</strong> has deviated from their planned route!
          <button style={styles.dismissBtn} onClick={() => setDeviationAlert(false)}>✕</button>
        </div>
      )}

      {/* Map */}
      {journey ? (
        <>
          <div style={styles.mapWrapper}>
            <SafeMap
              center={mapCenter}
              zoom={15}
              liveLocation={liveLocation}
              destination={journey.plannedDestination.coordinates}
              style={{ height: '100%' }}
            />
            {socketConnected && (
              <div style={styles.liveTag}>● LIVE</div>
            )}
          </div>

          {/* Journey info */}
          <div style={styles.infoPanel}>
            <div style={styles.infoRow}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Destination</span>
                <span style={styles.infoValue}>
                  {journey.plannedDestination.formattedAddress || 'Set destination'}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>ETA</span>
                <span style={styles.infoValue}>{etaTime}</span>
              </div>
              {remainingMin && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Remaining</span>
                  <span style={styles.infoValue}>{remainingMin} min</span>
                </div>
              )}
            </div>

            {journeyStatus === 'completed' && (
              <div style={styles.arrivedBanner}>
                ✅ {user.name} has arrived safely!
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={styles.noJourney}>
          <div style={{ fontSize: '3rem' }}>😴</div>
          <p style={styles.noJourneyText}>
            <strong>{user.name}</strong> doesn't have an active journey right now.
          </p>
          <p style={styles.noJourneySubtext}>
            This page will update automatically when they start a journey.
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>🛡️ Powered by SafeStride — Walk alone. Never be alone.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:      { minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", background: '#f9f9f9' },
  centered:       { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif" },
  spinner:        { fontSize: '3rem', animation: 'pulse 1.5s infinite' },
  loadingText:    { color: '#888', fontSize: '0.95rem' },
  errorTitle:     { fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', margin: 0 },
  errorText:      { fontSize: '0.9rem', color: '#888', textAlign: 'center', lineHeight: 1.5, margin: 0 },
  header:         { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #f0f0f0' },
  headerLeft:     { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar:         { width: '42px', height: '42px', borderRadius: '50%', background: '#fff0f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarImg:      { width: '100%', height: '100%', objectFit: 'cover' },
  avatarEmoji:    { fontSize: '1.3rem' },
  userName:       { fontWeight: 600, fontSize: '0.95rem', color: '#1a1a1a' },
  userPhone:      { fontSize: '0.78rem', color: '#aaa' },
  statusBadge:    { padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 },
  deviationBanner:{ background: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#92400E' },
  dismissBtn:     { background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', marginLeft: 'auto', fontSize: '1rem' },
  mapWrapper:     { flex: 1, position: 'relative', minHeight: '300px' },
  liveTag:        { position: 'absolute', top: '0.75rem', right: '0.75rem', background: '#E91E8C', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px', zIndex: 10 },
  infoPanel:      { background: '#fff', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  infoRow:        { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  infoItem:       { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  infoLabel:      { fontSize: '0.72rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' },
  infoValue:      { fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a' },
  arrivedBanner:  { background: '#D1FAE5', color: '#065F46', padding: '0.75rem 1rem', borderRadius: '10px', fontWeight: 600, textAlign: 'center', fontSize: '0.95rem' },
  noJourney:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', gap: '0.75rem' },
  noJourneyText:  { fontSize: '0.95rem', color: '#333', margin: 0, lineHeight: 1.5 },
  noJourneySubtext:{ fontSize: '0.82rem', color: '#888', margin: 0 },
  footer:         { padding: '1rem', textAlign: 'center', borderTop: '1px solid #f0f0f0', background: '#fff' },
  footerText:     { fontSize: '0.78rem', color: '#aaa', margin: 0 },
};