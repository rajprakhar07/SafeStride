/**
 * ProfileSetup.tsx — F-06
 * Onboarding Step 1: Name + profile photo.
 */

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, uploadProfilePhoto } from '../../services/api/user.api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const user     = useAuthStore((s) => s.user);
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [name,        setName]        = useState('');
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name'); return; }

    setIsLoading(true);
    setError('');

    try {
      // Upload photo first if selected
      if (photoFile) {
        await uploadProfilePhoto(photoFile);
      }

      // Update name
      await updateProfile({ name: name.trim() });

      // Update local auth store
      if (user) {
        setAuth(useAuthStore.getState().accessToken!, { ...user, name: name.trim() });
      }

      navigate('/onboarding/address');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Progress */}
      <div style={styles.progress}>
        <div style={styles.progressFill} />
      </div>
      <p style={styles.stepLabel}>Step 1 of 3</p>

      <h1 style={styles.title}>What's your name?</h1>
      <p style={styles.subtitle}>This helps your trusted contacts identify you in alerts.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Photo upload */}
        <div style={styles.photoSection}>
          <div
            style={styles.photoCircle}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" style={styles.photoImg} />
            ) : (
              <span style={styles.photoPlaceholder}>📷</span>
            )}
          </div>
          <button type="button" style={styles.photoBtn} onClick={() => fileInputRef.current?.click()}>
            {photoPreview ? 'Change photo' : 'Add photo (optional)'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
        </div>

        <Input
          label="Your full name"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          autoFocus
          error={error}
          disabled={isLoading}
        />

        <Button type="submit" loading={isLoading} fullWidth>
          Continue →
        </Button>
      </form>

      <button style={styles.skipBtn} onClick={() => navigate('/onboarding/address')}>
        Skip for now
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight:     '100dvh',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    padding:       '1.5rem',
    background:    '#fff',
    fontFamily:    "'Inter', system-ui, sans-serif",
    maxWidth:      '480px',
    margin:        '0 auto',
  },
  progress: {
    width: '100%', height: '4px', background: '#f0f0f0',
    borderRadius: '2px', marginBottom: '0.5rem',
  },
  progressFill: {
    width: '33%', height: '100%',
    background: '#E91E8C', borderRadius: '2px',
  },
  stepLabel: { fontSize: '0.8rem', color: '#aaa', alignSelf: 'flex-start', margin: '0 0 1.5rem' },
  title:     { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.5rem', alignSelf: 'flex-start', letterSpacing: '-0.02em' },
  subtitle:  { fontSize: '0.95rem', color: '#666', margin: '0 0 2rem', alignSelf: 'flex-start' },
  form:      { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  photoSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  photoCircle:  { width: '90px', height: '90px', borderRadius: '50%', background: '#fff0f6', border: '2px dashed #E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' },
  photoImg:     { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { fontSize: '2rem' },
  photoBtn:  { background: 'none', border: 'none', color: '#E91E8C', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  skipBtn:   { marginTop: '1rem', background: 'none', border: 'none', color: '#aaa', fontSize: '0.85rem', cursor: 'pointer' },
};