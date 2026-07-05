/**
 * AddressSetup.tsx — F-06
 * Onboarding Step 2: Home + work address.
 * Uses browser Geolocation API for "Use my location" + manual text input.
 * Google Places autocomplete wired if API key is set.
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../../services/api/user.api';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (el: HTMLInputElement, opts?: object) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => { formatted_address?: string; geometry?: { location?: { lat: () => number; lng: () => number } } };
          };
        };
      };
    };
  }
}

interface AddressState {
  formattedAddress: string;
  coordinates: { lat: number; lng: number } | null;
}

const emptyAddress = (): AddressState => ({ formattedAddress: '', coordinates: null });

export default function AddressSetup() {
  const navigate = useNavigate();

  const [home,      setHome]      = useState<AddressState>(emptyAddress());
  const [work,      setWork]      = useState<AddressState>(emptyAddress());
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [locating,  setLocating]  = useState(false);

  const homeInputRef = useRef<HTMLInputElement>(null);
  const workInputRef = useRef<HTMLInputElement>(null);

  // Wire Google Places autocomplete if key is set
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      if (!window.google?.maps?.places) return;

      [homeInputRef, workInputRef].forEach((ref, i) => {
        if (!ref.current) return;
        const ac = new window.google!.maps!.places!.Autocomplete(ref.current, {
          types:               ['geocode'],
          componentRestrictions: { country: 'in' },
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const addr  = place.formatted_address || '';
          const lat   = place.geometry?.location?.lat() ?? 0;
          const lng   = place.geometry?.location?.lng() ?? 0;
          if (i === 0) setHome({ formattedAddress: addr, coordinates: { lat, lng } });
          else         setWork({ formattedAddress: addr, coordinates: { lat, lng } });
        });
      });
    };
    document.head.appendChild(script);
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setHome({ formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, coordinates: { lat, lng } });
        setLocating(false);
      },
      () => { setError('Could not get location. Please type your address.'); setLocating(false); }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const updates: Record<string, unknown> = {};

      if (home.formattedAddress) {
        updates.homeAddress = {
          label:            'Home',
          formattedAddress: home.formattedAddress,
          ...(home.coordinates && { coordinates: home.coordinates }),
        };
      }
      if (work.formattedAddress) {
        updates.workAddress = {
          label:            'Work',
          formattedAddress: work.formattedAddress,
          ...(work.coordinates && { coordinates: work.coordinates }),
        };
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      }

      navigate('/onboarding/contacts');
    } catch {
      setError('Failed to save addresses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.progress}>
        <div style={{ ...styles.progressFill, width: '66%' }} />
      </div>
      <p style={styles.stepLabel}>Step 2 of 3</p>

      <h1 style={styles.title}>Your frequent places</h1>
      <p style={styles.subtitle}>Used to detect when you arrive safely and plan safer routes.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Home address */}
        <div style={styles.fieldGroup}>
          <div style={styles.fieldHeader}>
            <span style={styles.fieldIcon}>🏠</span>
            <span style={styles.fieldLabel}>Home address</span>
          </div>
          <Input
            ref={homeInputRef}
            placeholder="Start typing your home address…"
            value={home.formattedAddress}
            onChange={(e) => setHome({ formattedAddress: e.target.value, coordinates: null })}
            disabled={isLoading}
          />
          <button type="button" style={styles.locationBtn} onClick={useMyLocation} disabled={locating}>
            {locating ? '📍 Getting location…' : '📍 Use my current location'}
          </button>
        </div>

        {/* Work address */}
        <div style={styles.fieldGroup}>
          <div style={styles.fieldHeader}>
            <span style={styles.fieldIcon}>💼</span>
            <span style={styles.fieldLabel}>Work / College address</span>
          </div>
          <Input
            ref={workInputRef}
            placeholder="Start typing your work address… (optional)"
            value={work.formattedAddress}
            onChange={(e) => setWork({ formattedAddress: e.target.value, coordinates: null })}
            disabled={isLoading}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <Button type="submit" loading={isLoading} fullWidth>
          Continue →
        </Button>
      </form>

      <button style={styles.skipBtn} onClick={() => navigate('/onboarding/contacts')}>
        Skip for now
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:   { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto' },
  progress:    { width: '100%', height: '4px', background: '#f0f0f0', borderRadius: '2px', marginBottom: '0.5rem' },
  progressFill:{ height: '100%', background: '#E91E8C', borderRadius: '2px' },
  stepLabel:   { fontSize: '0.8rem', color: '#aaa', alignSelf: 'flex-start', margin: '0 0 1.5rem' },
  title:       { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.5rem', alignSelf: 'flex-start', letterSpacing: '-0.02em' },
  subtitle:    { fontSize: '0.95rem', color: '#666', margin: '0 0 2rem', alignSelf: 'flex-start' },
  form:        { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  fieldHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  fieldIcon:   { fontSize: '1.1rem' },
  fieldLabel:  { fontSize: '0.85rem', fontWeight: 600, color: '#333' },
  locationBtn: { background: 'none', border: 'none', color: '#E91E8C', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0', textAlign: 'left' },
  error:       { fontSize: '0.85rem', color: '#E91E8C', margin: 0 },
  skipBtn:     { marginTop: '1rem', background: 'none', border: 'none', color: '#aaa', fontSize: '0.85rem', cursor: 'pointer' },
};