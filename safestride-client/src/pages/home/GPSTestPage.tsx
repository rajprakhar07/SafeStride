/**
 * Temporary GPS test page — only for F-09 verification.
 * Remove or replace with real Home screen in F-12.
 */

import { useGeolocation } from '../../hooks/useGeolocation';

export default function GPSTestPage() {
  const { location, error, permissionState, isWatching, batteryLevel, isLowBattery, startWatching, stopWatching } = useGeolocation();

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      <h2 style={{ color: '#E91E8C' }}>F-09 — GPS Hook Test</h2>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={startWatching}
          disabled={isWatching}
          style={{ padding: '0.75rem 1.25rem', background: '#E91E8C', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isWatching ? 'not-allowed' : 'pointer', opacity: isWatching ? 0.6 : 1 }}
        >
          {isWatching ? '📍 Watching…' : '▶ Start GPS'}
        </button>
        <button
          onClick={stopWatching}
          disabled={!isWatching}
          style={{ padding: '0.75rem 1.25rem', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: !isWatching ? 'not-allowed' : 'pointer', opacity: !isWatching ? 0.6 : 1 }}
        >
          ■ Stop
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        {[
          ['Permission',   permissionState],
          ['Watching',     isWatching ? '✅ Yes' : '❌ No'],
          ['Battery',      batteryLevel !== null ? `${batteryLevel}% ${isLowBattery ? '🔋 LOW' : ''}` : 'N/A'],
          ['Latitude',     location?.lat?.toFixed(6) ?? '—'],
          ['Longitude',    location?.lng?.toFixed(6) ?? '—'],
          ['Accuracy',     location ? `${location.accuracy}m` : '—'],
          ['Speed',        location?.speed !== null ? `${location?.speed?.toFixed(1)} m/s` : '—'],
          ['Heading',      location?.heading !== null ? `${location?.heading?.toFixed(0)}°` : '—'],
          ['Last update',  location ? new Date(location.timestamp).toLocaleTimeString() : '—'],
        ].map(([label, value]) => (
          <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '0.5rem 0', color: '#888', width: '40%' }}>{label}</td>
            <td style={{ padding: '0.5rem 0', fontWeight: 500, color: '#1a1a1a' }}>{value}</td>
          </tr>
        ))}
      </table>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#FEE2E2', borderRadius: '10px', color: '#991B1B', fontSize: '0.85rem', lineHeight: 1.5 }}>
          ⚠ {error}
        </div>
      )}

      {permissionState === 'denied' && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#FFF3CD', borderRadius: '10px', color: '#856404', fontSize: '0.85rem' }}>
          💡 To fix: Click the 🔒 lock icon in your browser address bar → Allow Location
        </div>
      )}
    </div>
  );
}