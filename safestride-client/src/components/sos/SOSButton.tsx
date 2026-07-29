/**
 * SOSButton.tsx
 * Hold for 3 seconds to trigger emergency SOS.
 * Now waits for valid GPS coordinates before sending.
 */

import { useState, useRef, useEffect } from 'react';
import { useSOSStore } from '../../store/sosStore';
import { useJourneyStore } from '../../store/journeyStore';
import { triggerSOS } from '../../services/api/sos.api';

export default function SOSButton() {
  const [isPressing, setIsPressing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [progress, setIsProgress] = useState(0);
  
  const timerRef = useRef<any>(null);
  const activeJourney = useJourneyStore((s) => s.activeJourney);
  const setSOSActive = useSOSStore((s) => s.setSOSActive);

  const handlePressStart = () => {
    setIsPressing(true);
    setIsProgress(0);
    
    // Start 3-second countdown
    let startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / 3000) * 100, 100);
      setIsProgress(p);

      if (elapsed >= 3000) {
        clearInterval(timerRef.current);
        initiateSOS();
      }
    }, 50);
  };

  const handlePressEnd = () => {
    setIsPressing(false);
    setIsProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const initiateSOS = () => {
    setIsLocating(true);
    
    // Force High-Accuracy GPS Scan
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        
        // Ensure coordinates are valid (not 0,0)
        if (latitude !== 0 && longitude !== 0) {
          try {
            const event = await triggerSOS({
              journeyId: activeJourney?._id || null,
              triggeredBy: 'button',
              location: { lat: latitude, lng: longitude, accuracy }
            });
            setSOSActive(event);
          } catch (err) {
            console.error('SOS Trigger failed:', err);
            alert('Failed to send SOS. Please call emergency services directly.');
          } finally {
            setIsLocating(false);
            setIsPressing(false);
          }
        } else {
          alert('GPS error: Could not get a valid location. Please try again.');
          setIsLocating(false);
          setIsPressing(false);
        }
      },
      (err) => {
        console.error('GPS error during SOS:', err);
        alert('Location access is required for SOS. Please enable GPS.');
        setIsLocating(false);
        setIsPressing(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div style={styles.container}>
      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        style={{
          ...styles.button,
          transform: isPressing ? 'scale(0.95)' : 'scale(1)',
          background: isLocating ? '#666' : '#E91E8C'
        }}
      >
        <div style={styles.label}>
          {isLocating ? 'LOCATING...' : isPressing ? 'HOLDING...' : 'SOS'}
        </div>
        
        {/* Progress Ring */}
        <svg style={styles.svg}>
          <circle
            cx="40" cy="40" r="36"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="40" cy="40" r="36"
            stroke="#fff"
            strokeWidth="4"
            fill="none"
            strokeDasharray="226"
            strokeDashoffset={226 - (226 * progress) / 100}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '80px', height: '80px' },
  button: { 
    width: '80px', height: '80px', borderRadius: '50%', border: 'none', 
    color: '#fff', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(233,30,140,0.4)', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.1s, background 0.3s', outline: 'none'
  },
  label: { zIndex: 2, fontSize: '0.9rem', textAlign: 'center' },
  svg: { 
    position: 'absolute', top: 0, left: 0, width: '80px', height: '80px', 
    transform: 'rotate(-90deg)', zIndex: 1 
  }
};
