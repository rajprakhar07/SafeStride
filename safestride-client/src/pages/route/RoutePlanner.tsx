/**
 * RoutePlanner.tsx — F-23
 * Route safety scorer — enter origin + destination, see risk score.
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { scoreRoute, type RouteRiskScore } from '../../services/api/risk.api';
import { useGeolocation } from '../../hooks/useGeolocation';
import RiskBadge from '../../components/journey/RiskBadge';
import Button    from '../../components/common/Button';
import Input     from '../../components/common/Input';

const TRANSPORT_MODES = [
  { value: 'walking', label: '🚶 Walking' },
  { value: 'auto',    label: '🛺 Auto'    },
  { value: 'cab',     label: '🚗 Cab'     },
  { value: 'bus',     label: '🚌 Bus'     },
];

export default function RoutePlanner() {
  const navigate = useNavigate();
  const { location, startWatching } = useGeolocation();

  const [originLat,   setOriginLat]   = useState('');
  const [originLng,   setOriginLng]   = useState('');
  const [destLat,     setDestLat]     = useState('');
  const [destLng,     setDestLng]     = useState('');
  const [transport,   setTransport]   = useState('walking');
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState('');
  const [result,      setResult]      = useState<RouteRiskScore | null>(null);

  function useCurrentLocation() {
    startWatching();
    if (location) {
      setOriginLat(location.lat.toFixed(6));
      setOriginLng(location.lng.toFixed(6));
    } else {
      setError('Location not available yet. Please wait a moment.');
    }
  }

  async function handleScore(e: FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      setError('Please enter valid coordinates for both origin and destination');
      return;
    }

    setIsLoading(true);
    try {
      const score = await scoreRoute({
        origin:       { lat: oLat, lng: oLng },
        destination:  { lat: dLat, lng: dLng },
        transportMode: transport,
      });
      setResult(score);
    } catch {
      setError('Failed to score route. Make sure the AI service is running.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
      <h1 style={styles.title}>Route Safety Check</h1>
      <p style={styles.subtitle}>Check how safe your route is before you leave.</p>

      <form onSubmit={handleScore} style={styles.form}>
        {/* Origin */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>📍 Your location</span>
            <button type="button" style={styles.locationBtn} onClick={useCurrentLocation}>
              Use GPS
            </button>
          </div>
          <div style={styles.coordRow}>
            <Input label="Latitude"  placeholder="18.5314" value={originLat} onChange={(e) => setOriginLat(e.target.value)} />
            <Input label="Longitude" placeholder="73.8446" value={originLng} onChange={(e) => setOriginLng(e.target.value)} />
          </div>
        </div>

        {/* Destination */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>🏁 Destination</span>
          <div style={styles.coordRow}>
            <Input label="Latitude"  placeholder="18.5204" value={destLat} onChange={(e) => setDestLat(e.target.value)} />
            <Input label="Longitude" placeholder="73.8567" value={destLng} onChange={(e) => setDestLng(e.target.value)} />
          </div>
        </div>

        {/* Transport */}
        <div>
          <span style={styles.sectionLabel}>🚶 How are you travelling?</span>
          <div style={styles.modeRow}>
            {TRANSPORT_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setTransport(m.value)}
                style={{
                  ...styles.modeBtn,
                  background: transport === m.value ? '#E91E8C' : '#f5f5f5',
                  color:      transport === m.value ? '#fff'    : '#333',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <Button type="submit" fullWidth loading={isLoading}>
          🔍 Check Route Safety
        </Button>
      </form>

      {/* Result */}
      {result && (
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <RiskBadge riskLevel={result.riskLevel} riskScore={result.riskScore} size="lg" />
          </div>

          <p style={styles.recommendation}>{result.recommendation}</p>

          {result.dangerSpotCount > 0 && (
            <div style={styles.spotsWarning}>
              ⚠️ {result.dangerSpotCount} community-reported danger spot(s) near this route
            </div>
          )}

          {/* Factor breakdown */}
          <div style={styles.factorsTitle}>Risk breakdown</div>
          {result.factors.map((f, i) => (
            <div key={i} style={styles.factorRow}>
              <div style={styles.factorInfo}>
                <span style={styles.factorName}>{f.factor}</span>
                <span style={styles.factorDesc}>{f.description}</span>
              </div>
              <div style={styles.factorBarWrap}>
                <div style={{
                  ...styles.factorBar,
                  width:      `${(f.score / f.max) * 100}%`,
                  background: f.score / f.max > 0.6 ? '#EF4444' : f.score / f.max > 0.3 ? '#F59E0B' : '#22C55E',
                }} />
              </div>
              <span style={styles.factorScore}>{Math.round(f.score)}/{f.max}</span>
            </div>
          ))}

          {/* Start journey with this route */}
          <Button
            fullWidth
            onClick={() => navigate('/journey/start')}
            style={{ marginTop: '1rem' }}
          >
            Start Journey on This Route →
          </Button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:     { minHeight: '100dvh', padding: '1.5rem', background: '#f9f9f9', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' },
  back:          { background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0', alignSelf: 'flex-start' },
  title:         { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' },
  subtitle:      { fontSize: '0.9rem', color: '#666', margin: 0 },
  form:          { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  section:       { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel:  { fontSize: '0.85rem', fontWeight: 600, color: '#333' },
  locationBtn:   { background: 'none', border: 'none', color: '#E91E8C', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  coordRow:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  modeRow:       { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' },
  modeBtn:       { padding: '0.5rem 0.85rem', border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' },
  error:         { fontSize: '0.85rem', color: '#E91E8C', margin: 0 },
  resultCard:    { background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  resultHeader:  { display: 'flex', justifyContent: 'center' },
  recommendation:{ fontSize: '0.9rem', color: '#444', textAlign: 'center', margin: 0, lineHeight: 1.5 },
  spotsWarning:  { background: '#FEF3C7', color: '#92400E', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 500 },
  factorsTitle:  { fontSize: '0.82rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' },
  factorRow:     { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  factorInfo:    { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' },
  factorName:    { fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a' },
  factorDesc:    { fontSize: '0.72rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  factorBarWrap: { width: '60px', height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 },
  factorBar:     { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  factorScore:   { fontSize: '0.72rem', color: '#888', flexShrink: 0, width: '30px', textAlign: 'right' },
};