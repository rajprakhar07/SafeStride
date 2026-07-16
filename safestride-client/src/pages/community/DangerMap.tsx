/**
 * DangerMap.tsx — F-25
 * Community danger map — full-screen map with:
 *   - Danger spot markers (color-coded by category)
 *   - Tap marker → details + confirm button
 *   - Long-press map → report new spot form
 *   - Filter by category
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getDangerSpots,
  reportDangerSpot,
  confirmDangerSpot,
  type DangerSpot,
} from '../../services/api/risk.api';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  harassment:    { label: 'Harassment',    emoji: '😰', color: '#EF4444' },
  poor_lighting: { label: 'Poor Lighting', emoji: '🔦', color: '#F59E0B' },
  isolated_area: { label: 'Isolated Area', emoji: '🚫', color: '#8B5CF6' },
  accident_prone:{ label: 'Accident Prone',emoji: '⚠️', color: '#F97316' },
  other:         { label: 'Other',         emoji: '📍', color: '#6B7280' },
};

const SEVERITY_CONFIG = {
  low:    { color: '#22C55E', label: 'Low risk'    },
  medium: { color: '#F59E0B', label: 'Medium risk' },
  high:   { color: '#EF4444', label: 'High risk'   },
};

// ─── Map click handler ────────────────────────────────────────────────────────
function MapClickHandler({ onLongPress }: { onLongPress: (lat: number, lng: number) => void }) {
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  useMapEvents({
    mousedown(e) {
      pressTimer = setTimeout(() => {
        onLongPress(e.latlng.lat, e.latlng.lng);
      }, 800);
    },
    mouseup() { if (pressTimer) clearTimeout(pressTimer); },
    mousemove() { if (pressTimer) clearTimeout(pressTimer); },
  });
  return null;
}

// ─── Danger spot markers ──────────────────────────────────────────────────────
function DangerSpotMarkers({
  spots,
  onSelect,
}: {
  spots: DangerSpot[];
  onSelect: (spot: DangerSpot) => void;
}) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    spots.forEach((spot) => {
      const [lng, lat] = spot.location.coordinates;
      const cfg = CATEGORY_CONFIG[spot.category] || CATEGORY_CONFIG.other;
      const sev = SEVERITY_CONFIG[spot.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;

      const icon = L.divIcon({
        html: `
          <div style="
            background:${sev.color};
            border:2px solid #fff;
            border-radius:50%;
            width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;
            font-size:14px;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            cursor:pointer;
          ">${cfg.emoji}</div>
        `,
        className: '',
        iconSize:  [32, 32],
        iconAnchor:[16, 16],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .on('click', () => onSelect(spot));

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [spots, map, onSelect]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DangerMap() {
  const navigate = useNavigate();

  const [spots,          setSpots]          = useState<DangerSpot[]>([]);
  const [selectedSpot,   setSelectedSpot]   = useState<DangerSpot | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportLat,      setReportLat]      = useState(0);
  const [reportLng,      setReportLng]      = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [confirmDone,    setConfirmDone]    = useState(false);

  // Report form state
  const [reportCategory,   setReportCategory]   = useState('poor_lighting');
  const [reportDescription,setReportDescription]= useState('');
  const [reportSeverity,   setReportSeverity]   = useState('medium');
  const [isAnonymous,      setIsAnonymous]      = useState(false);

  // Default center — Pune
  const mapCenter: [number, number] = [18.5204, 73.8567];

  useEffect(() => {
    fetchSpots();
  }, []);

  async function fetchSpots() {
    setIsLoading(true);
    try {
      const data = await getDangerSpots(mapCenter[0], mapCenter[1], 5000);
      setSpots(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm(spotId: string) {
    try {
      await confirmDangerSpot(spotId);
      setConfirmDone(true);
      setTimeout(() => {
        setConfirmDone(false);
        setSelectedSpot(null);
        fetchSpots();
      }, 1500);
    } catch { /* ignore */ }
  }

  async function handleReport() {
    if (!reportCategory) return;
    setIsSubmitting(true);
    try {
      await reportDangerSpot({
        lat:         reportLat,
        lng:         reportLng,
        category:    reportCategory,
        description: reportDescription || undefined,
        severity:    reportSeverity,
        isAnonymous,
      });
      setShowReportForm(false);
      setReportDescription('');
      fetchSpots();
    } catch { /* ignore */ }
    finally { setIsSubmitting(false); }
  }

  const filteredSpots = activeCategory
    ? spots.filter((s) => s.category === activeCategory)
    : spots;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>←</button>
        <h1 style={styles.title}>Community Safety Map</h1>
        <span style={styles.count}>{spots.length} spots</span>
      </div>

      {/* Category filters */}
      <div style={styles.filters}>
        <button
          style={{ ...styles.filterBtn, background: !activeCategory ? '#E91E8C' : '#f5f5f5', color: !activeCategory ? '#fff' : '#333' }}
          onClick={() => setActiveCategory(null)}
        >All</button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            style={{ ...styles.filterBtn, background: activeCategory === key ? '#E91E8C' : '#f5f5f5', color: activeCategory === key ? '#fff' : '#333' }}
            onClick={() => setActiveCategory(activeCategory === key ? null : key)}
          >
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={styles.mapWrapper}>
        <MapContainer center={mapCenter} zoom={14} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <DangerSpotMarkers spots={filteredSpots} onSelect={setSelectedSpot} />
          <MapClickHandler onLongPress={(lat, lng) => {
            setReportLat(lat);
            setReportLng(lng);
            setShowReportForm(true);
          }} />
        </MapContainer>

        {isLoading && (
          <div style={styles.loadingOverlay}>Loading spots…</div>
        )}

        <div style={styles.longPressHint}>Long-press map to report a spot</div>
      </div>

      {/* Selected spot detail */}
      {selectedSpot && !showReportForm && (
        <div style={styles.bottomSheet}>
          <div style={styles.sheetHandle} />
          <div style={styles.sheetHeader}>
            <span style={{ fontSize: '1.5rem' }}>
              {CATEGORY_CONFIG[selectedSpot.category]?.emoji}
            </span>
            <div>
              <div style={styles.sheetTitle}>
                {CATEGORY_CONFIG[selectedSpot.category]?.label}
              </div>
              <div style={styles.sheetMeta}>
                {SEVERITY_CONFIG[selectedSpot.severity as keyof typeof SEVERITY_CONFIG]?.label}
                {' · '}{selectedSpot.confirmCount} confirmation(s)
              </div>
            </div>
            <button style={styles.closeBtn} onClick={() => setSelectedSpot(null)}>✕</button>
          </div>

          {selectedSpot.description && (
            <p style={styles.sheetDesc}>{(selectedSpot as any).description}</p>
          )}

          <div style={styles.sheetExpiry}>
            Active until {new Date(selectedSpot.activeUntil).toLocaleDateString()}
          </div>

          {confirmDone ? (
            <div style={styles.confirmDone}>✅ Confirmed! Thank you.</div>
          ) : (
            <Button fullWidth onClick={() => handleConfirm(selectedSpot._id)}>
              👍 Confirm this spot is unsafe
            </Button>
          )}
        </div>
      )}

      {/* Report form */}
      {showReportForm && (
        <div style={styles.bottomSheet}>
          <div style={styles.sheetHandle} />
          <div style={styles.sheetTitle}>Report unsafe spot</div>
          <p style={styles.sheetMeta}>
            📍 {reportLat.toFixed(4)}, {reportLng.toFixed(4)}
          </p>

          {/* Category */}
          <div style={styles.categoryGrid}>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                style={{
                  ...styles.categoryBtn,
                  background:  reportCategory === key ? '#fff0f6' : '#f9f9f9',
                  borderColor: reportCategory === key ? '#E91E8C' : '#e0e0e0',
                  color:       reportCategory === key ? '#E91E8C' : '#555',
                }}
                onClick={() => setReportCategory(key)}
              >
                <span>{cfg.emoji}</span>
                <span style={{ fontSize: '0.72rem' }}>{cfg.label}</span>
              </button>
            ))}
          </div>

          {/* Severity */}
          <div style={styles.severityRow}>
            {['low', 'medium', 'high'].map((s) => (
              <button
                key={s}
                style={{
                  ...styles.severityBtn,
                  background:  reportSeverity === s ? SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG].color : '#f5f5f5',
                  color:       reportSeverity === s ? '#fff' : '#555',
                }}
                onClick={() => setReportSeverity(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <Input
            placeholder="Describe what makes this unsafe… (optional)"
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
          />

          <label style={styles.anonLabel}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            {' '}Report anonymously
          </label>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button fullWidth loading={isSubmitting} onClick={handleReport}>
              Submit Report
            </Button>
            <Button variant="ghost" onClick={() => setShowReportForm(false)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:      { height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", background: '#f9f9f9' },
  header:         { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: '#fff', borderBottom: '1px solid #f0f0f0' },
  back:           { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888', flexShrink: 0 },
  title:          { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', flex: 1, margin: 0 },
  count:          { fontSize: '0.78rem', color: '#aaa', flexShrink: 0 },
  filters:        { display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #f0f0f0' },
  filterBtn:      { padding: '0.3rem 0.75rem', border: 'none', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  mapWrapper:     { flex: 1, position: 'relative' },
  loadingOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10, fontSize: '0.9rem', color: '#888' },
  longPressHint:  { position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', zIndex: 10, pointerEvents: 'none', whiteSpace: 'nowrap' },
  bottomSheet:    { background: '#fff', borderRadius: '20px 20px 0 0', padding: '1rem 1.25rem 2rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto' },
  sheetHandle:    { width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '2px', alignSelf: 'center', marginBottom: '0.25rem' },
  sheetHeader:    { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  sheetTitle:     { fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', flex: 1 },
  sheetMeta:      { fontSize: '0.78rem', color: '#888' },
  sheetDesc:      { fontSize: '0.88rem', color: '#555', margin: 0, lineHeight: 1.5 },
  sheetExpiry:    { fontSize: '0.75rem', color: '#aaa' },
  confirmDone:    { background: '#D1FAE5', color: '#065F46', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', fontWeight: 600 },
  closeBtn:       { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 },
  categoryGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' },
  categoryBtn:    { padding: '0.5rem 0.25rem', border: '1.5px solid', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', fontSize: '1.1rem' },
  severityRow:    { display: 'flex', gap: '0.5rem' },
  severityBtn:    { flex: 1, padding: '0.4rem', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' },
  anonLabel:      { fontSize: '0.82rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' },
};