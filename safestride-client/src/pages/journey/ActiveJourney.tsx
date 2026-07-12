/**
 * ActiveJourney.tsx — updated in F-21
 * Adds SOS button and SOSStatus overlay.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourneyStore } from '../../store/journeyStore';
import { useSOSStore }     from '../../store/sosStore';
import { useWebSocket }    from '../../hooks/useWebSocket';
import { useGeolocation }  from '../../hooks/useGeolocation';
import { endJourney }      from '../../services/api/journey.api';
import ETADisplay          from '../../components/journey/ETADisplay';
import SafeMap             from '../../components/map/SafeMap';
import SOSButton           from '../../components/sos/SOSButton';
import SOSStatus           from '../../components/sos/SOSStatus';
import type { Coordinates } from '../../store/journeyStore';

function decodePolyline(encoded: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export default function ActiveJourney() {
  const navigate = useNavigate();
  const { connect, joinJourney, startPinging, stopPinging, endJourneySocket } = useWebSocket();
  const { location, startWatching, stopWatching } = useGeolocation();

  const activeJourney    = useJourneyStore((s) => s.activeJourney);
  const currentLocation  = useJourneyStore((s) => s.currentLocation);
  const deviationAlert   = useJourneyStore((s) => s.deviationAlert);
  const clearJourney     = useJourneyStore((s) => s.clearJourney);
  const setDeviationAlert = useJourneyStore((s) => s.setDeviationAlert);

  const isSOSActive = useSOSStore((s) => s.isSOSActive);

  const locationRef = useRef(location);
  locationRef.current = location;

  const [deviationSpot, setDeviationSpot] = useState<Coordinates | null>(null);
  const [isEnding,      setIsEnding]      = useState(false);

  useEffect(() => { if (!activeJourney) navigate('/'); }, [activeJourney, navigate]);

  useEffect(() => {
    if (deviationAlert && currentLocation && !deviationSpot) {
      setDeviationSpot({ lat: currentLocation.lat, lng: currentLocation.lng });
    }
    if (!deviationAlert) setDeviationSpot(null);
  }, [deviationAlert, currentLocation, deviationSpot]);

  useEffect(() => {
    if (!activeJourney) return;
    connect();
    startWatching();
    const timer = setTimeout(() => {
      joinJourney(activeJourney._id);
      startPinging(() => {
        const loc = locationRef.current;
        if (!loc) return null;
        return { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, speed: loc.speed };
      });
    }, 1000);
    return () => { clearTimeout(timer); stopPinging(); stopWatching(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJourney?._id]);

  async function handleEndJourney() {
    if (!activeJourney || isEnding) return;
    setIsEnding(true);
    try {
      endJourneySocket(activeJourney._id);
      await endJourney(activeJourney._id).catch(() => {});
    } finally {
      stopPinging(); stopWatching(); clearJourney(); navigate('/');
    }
  }

  if (!activeJourney) return null;

  const mapCenter = currentLocation
    ?? (location ? { lat: location.lat, lng: location.lng } : null)
    ?? activeJourney.startLocation.coordinates;

  const polylinePoints = activeJourney.plannedRoute?.polyline
    ? decodePolyline(activeJourney.plannedRoute.polyline) : [];

  return (
    <div style={styles.container}>
      {/* SOS overlay — shown when SOS is active */}
      {isSOSActive && <SOSStatus />}

      {/* Map */}
      <div style={styles.mapWrapper}>
        <SafeMap
          center={mapCenter} zoom={16}
          liveLocation={currentLocation ?? (location ? { lat: location.lat, lng: location.lng } : null)}
          destination={activeJourney.plannedDestination.coordinates}
          polylinePoints={polylinePoints}
          deviationSpot={deviationSpot}
          style={{ height: '100%' }}
        />
      </div>

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={{ ...styles.statusDot, background: deviationAlert ? '#F59E0B' : '#22C55E' }} />
        <span style={{ ...styles.statusText, color: deviationAlert ? '#92400E' : '#22C55E' }}>
          {deviationAlert ? 'Off Route' : 'Journey Active'}
        </span>
        <span style={styles.destination}>
          → {activeJourney.plannedDestination.formattedAddress || 'Destination'}
        </span>
      </div>

      {/* Deviation banner */}
      {deviationAlert && (
        <div style={styles.deviationBanner}>
          <div style={styles.deviationContent}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#78350F' }}>You've left your route!</div>
              <div style={{ fontSize: '0.78rem', color: '#92400E' }}>Your trusted contacts have been notified.</div>
            </div>
          </div>
          <button style={styles.dismissBtn} onClick={() => setDeviationAlert(false)}>✕</button>
        </div>
      )}

      {/* Bottom panel */}
      <div style={styles.bottomPanel}>
        <ETADisplay />

        {/* SOS Button centered above End Journey */}
        <div style={styles.sosRow}>
          <div style={styles.sosLabel}>
            <div style={styles.sosLabelTitle}>Emergency?</div>
            <div style={styles.sosLabelSub}>Hold the button</div>
          </div>
          <SOSButton />
        </div>

        <button
          onClick={handleEndJourney} disabled={isEnding}
          style={{ ...styles.endBtn, opacity: isEnding ? 0.7 : 1 }}
        >
          {isEnding ? 'Ending…' : '🏠 I\'m Home — End Journey'}
        </button>

        <p style={styles.safetyNote}>🛡️ Trusted contacts are monitoring your journey</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:        { position: 'relative', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' },
  mapWrapper:       { flex: 1, position: 'relative', zIndex: 0 },
  topBar:           { position: 'absolute', top: '1rem', left: '1rem', right: '1rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '0.6rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' },
  statusDot:        { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s' },
  statusText:       { fontSize: '0.85rem', fontWeight: 600, flexShrink: 0, transition: 'color 0.3s' },
  destination:      { fontSize: '0.82rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deviationBanner:  { position: 'absolute', top: '4.5rem', left: '1rem', right: '1rem', zIndex: 20, background: '#FEF3C7', border: '1.5px solid #F59E0B', borderRadius: '14px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  deviationContent: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  dismissBtn:       { background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', flexShrink: 0 },
  bottomPanel:      { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, background: 'rgba(255,255,255,0.97)', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.5rem 2rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: '1rem' },
  sosRow:           { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' },
  sosLabel:         { display: 'flex', flexDirection: 'column', gap: '2px' },
  sosLabelTitle:    { fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' },
  sosLabelSub:      { fontSize: '0.78rem', color: '#aaa' },
  endBtn:           { width: '100%', padding: '0.9rem', background: '#E91E8C', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  safetyNote:       { fontSize: '0.78rem', color: '#aaa', textAlign: 'center', margin: 0 },
};