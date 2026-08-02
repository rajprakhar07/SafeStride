/**
 * AddressSetup.tsx — F-06
 * Onboarding Step 2: Home + work address.
 * Uses browser Geolocation API for "Use my location" + manual text input.
 * Google Places autocomplete wired if API key is set.
 */

import { useState } from 'react';
import { searchAddress } from '../../services/api/geocode.api';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../../services/api/user.api';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';



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
  const [homeSuggestions, setHomeSuggestions] = useState([]);
  const [workSuggestions, setWorkSuggestions] = useState([]);
  const [searchingHome, setSearchingHome] = useState(false);
  const [searchingWork, setSearchingWork] = useState(false);

 
  // Wire Google Places autocomplete if key is set
  

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
  async function fetchSuggestions(query: string, isHome: boolean) {
  if (query.trim().length < 3) {
    if (isHome) {
      setHomeSuggestions([]);
    } else {
      setWorkSuggestions([]);
    }
    return;
  }

  try {
    if (isHome) {
      setSearchingHome(true);
    } else {
      setSearchingWork(true);
    }

    const results = await searchAddress(query);

    if (isHome) {
      setHomeSuggestions(results);
    } else {
      setWorkSuggestions(results);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (isHome) {
      setSearchingHome(false);
    } else {
      setSearchingWork(false);
    }
  }
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
            
            placeholder="Start typing your home address…"
            value={home.formattedAddress}
            onChange={(e) => {
    const value = e.target.value;

    setHome({
        formattedAddress: value,
        coordinates: null
    });

    fetchSuggestions(value, true);
}}
            disabled={isLoading}
          />
          {searchingHome && (
  <div style={{ fontSize: '0.85rem', color: '#777' }}>
    Searching...
  </div>
)}

{homeSuggestions.length > 0 && (
  <div
    style={{
      border: '1px solid #ddd',
      borderRadius: 8,
      background: '#fff',
      maxHeight: 220,
      overflowY: 'auto',
      marginTop: 6,
    }}
  >
    {homeSuggestions.map((item: any, index: number) => (
      <div
        key={index}
        style={{
          padding: '10px',
          cursor: 'pointer',
          borderBottom: '1px solid #eee',
        }}
        onClick={() => {
          setHome({
            formattedAddress: item.label,
            coordinates: item.coordinates,
          });
          setHomeSuggestions([]);
        }}
      >
        {item.label}
      </div>
    ))}
  </div>
)}
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
            
            placeholder="Start typing your work address… (optional)"
            value={work.formattedAddress}
            onChange={(e) => {
    const value = e.target.value;

    setWork({
        formattedAddress: value,
        coordinates: null
    });

    fetchSuggestions(value, false);
}}
            disabled={isLoading}
          />{searchingWork && (
  <div style={{ fontSize: '0.85rem', color: '#777' }}>
    Searching...
  </div>
)}

{workSuggestions.length > 0 && (
  <div
    style={{
      border: '1px solid #ddd',
      borderRadius: 8,
      background: '#fff',
      maxHeight: 220,
      overflowY: 'auto',
      marginTop: 6,
    }}
  >
    {workSuggestions.map((item: any, index: number) => (
      <div
        key={index}
        style={{
          padding: '10px',
          cursor: 'pointer',
          borderBottom: '1px solid #eee',
        }}
        onClick={() => {
          setWork({
            formattedAddress: item.label,
            coordinates: item.coordinates,
          });
          setWorkSuggestions([]);
        }}
      >
        {item.label}
      </div>
    ))}
  </div>
)}
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