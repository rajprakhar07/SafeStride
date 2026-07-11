/**
 * StartJourney.tsx — F-12
 * Screen to configure and start a new journey.
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { startJourney } from '../../services/api/journey.api';
import { useJourneyStore } from '../../store/journeyStore';
import useGeolocation from '../../hooks/useGeolocation';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';

const TRANSPORT_MODES = [
  { value: 'walking', label: '🚶 Walking' },
  { value: 'auto',    label: '🛺 Auto'    },
  { value: 'cab',     label: '🚗 Cab'     },
  { value: 'bus',     label: '🚌 Bus'     },
];

export default function StartJourney() {
  const navigate = useNavigate();
  const setActiveJourney = useJourneyStore((s) => s.setActiveJourney);
  const { location, startWatching } = useGeolocation();

  const [destination, setDestination] = useState('');
  const [duration,    setDuration]    = useState('20');
  const [transport,   setTransport]   = useState('walking');
  const [destCoords,  setDestCoords]  = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState('');

  // For demo/dev: allow manual lat/lng if geocoding not available
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Resolve destination coordinates
    let dest = destCoords;
    if (!dest && destLat && destLng) {
      dest = { lat: parseFloat(destLat), lng: parseFloat(destLng) };
    }
    if (!dest) {
      setError('Please enter destination coordinates (lat/lng) for now. Google Maps integration coming soon.');
      return;
    }

    // Get current location
    startWatching();
    const currentLoc = location
      ? { lat: location.lat, lng: location.lng }
      : { lat: 18.5204, lng: 73.8567 }; // Pune fallback for testing

    const durationMins = parseInt(duration);
    if (!durationMins || durationMins < 1) {
      setError('Please enter a valid duration');
      return;
    }

    setIsLoading(true);
    try {
      const journey = await startJourney({
        destination:           { ...dest, formattedAddress: destination },
        currentLocation:       currentLoc,
        plannedDurationMinutes: durationMins,
        transportMode:         transport as 'walking' | 'auto' | 'cab' | 'bus',
        initiatedBy:           'manual',
      });

      setActiveJourney(journey);
      navigate('/journey/active');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to start journey. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/')}>← Back</button>

      <h1 style={styles.title}>Start Journey</h1>
      <p style={styles.subtitle}>Where are you going?</p>

      <form onSubmit={handleStart} style={styles.form}>
        <Input
          label="Destination name"
          placeholder="e.g. Home, Pune Station, College"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          disabled={isLoading}
        />

        {/* Manual lat/lng for dev — will be replaced by Google Places in F-23 */}
        <div style={styles.coordRow}>
          <Input
            label="Dest. Latitude"
            placeholder="18.5204"
            type="number"
            value={destLat}
            onChange={(e) => setDestLat(e.target.value)}
            disabled={isLoading}
          />
          <Input
            label="Dest. Longitude"
            placeholder="73.8567"
            type="number"
            value={destLng}
            onChange={(e) => setDestLng(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label style={styles.label}>Duration (minutes)</label>
          <Input
            type="number"
            placeholder="20"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={isLoading}
            style={{ marginTop: '0.4rem' }}
          />
        </div>

        <div>
          <label style={styles.label}>Transport mode</label>
          <div style={styles.modeRow}>
            {TRANSPORT_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setTransport(m.value)}
                style={{
                  ...styles.modeBtn,
                  background:  transport === m.value ? '#E91E8C' : '#f5f5f5',
                  color:       transport === m.value ? '#fff' : '#333',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <Button type="submit" fullWidth loading={isLoading} style={{ marginTop: '0.5rem' }}>
          🛡️ Start Guardian Mode
        </Button>
      </form>

      <div style={styles.hint}>
        <p>📍 Your trusted contacts will be notified when your journey starts.</p>
        <p>⏰ If you don't arrive on time, they'll be alerted automatically.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto' },
  back:      { background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0', marginBottom: '1.5rem', alignSelf: 'flex-start' },
  title:     { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.25rem', letterSpacing: '-0.02em' },
  subtitle:  { fontSize: '0.95rem', color: '#666', margin: '0 0 1.5rem' },
  form:      { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
  coordRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  label:     { fontSize: '0.85rem', fontWeight: 600, color: '#333' },
  modeRow:   { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' },
  modeBtn:   { padding: '0.5rem 0.85rem', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' },
  error:     { fontSize: '0.85rem', color: '#E91E8C', margin: 0 },
  hint:      { marginTop: '1.5rem', padding: '1rem', background: '#fff0f6', borderRadius: '12px' },
};