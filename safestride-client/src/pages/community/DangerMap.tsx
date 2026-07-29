import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDangerSpots, type DangerSpot } from '../../services/api/risk.api';
import Button from '../../components/common/Button';

// --- News Logic ---
interface NewsAlert {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string; url: string };
  location?: { lat: number; lng: number };
}

async function fetchSafetyNews(): Promise<NewsAlert[]> {
  // In a real app, this would call an API with lat/lng
  return [
    {
      title: "Local Safety Alert",
      description: "Police have increased patrols in this area due to recent reports.",
      url: "https://example.com",
      publishedAt: new Date().toISOString(),
      source: { name: "Local News", url: "https://example.com" },
      location: { lat: 18.5314, lng: 73.8446 }
    }
  ];
}

// --- Map Components ---
function MapClickHandler({ onLongPress }: { onLongPress: (lat: number, lng: number) => void }) {
  useMapEvents({ contextmenu(e) { onLongPress(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function DangerMarkers({ spots, news, onSelectSpot, onSelectNews }: any) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (Array.isArray(spots)) {
      spots.forEach((s) => {
        if (!s?.location?.coordinates) return;
        const [lng, lat] = s.location.coordinates;
        const icon = L.divIcon({
          html: `<div style="background:#F59E0B;border:2px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">📍</div>`,
          className: '', iconSize: [32, 32], iconAnchor:[16, 16],
        });
        const m = L.marker([lat, lng], { icon }).addTo(map).on('click', () => onSelectSpot(s));
        markersRef.current.push(m);
      });
    }

    if (Array.isArray(news)) {
      news.forEach((n) => {
        if (!n?.location?.lat) return;
        const icon = L.divIcon({
          html: `<div style="background:#E11D48;color:#fff;border-radius:10px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 10px rgba(225,29,72,0.6);animation:pulse-red 2s infinite;cursor:pointer;">📰</div>`,
          className: '', iconSize: [32, 32], iconAnchor: [16, 16],
        });
        const m = L.marker([n.location.lat, n.location.lng], { icon }).addTo(map).on('click', () => onSelectNews(n));
        markersRef.current.push(m);
      });
    }
    return () => { markersRef.current.forEach((m) => m.remove()); };
  }, [spots, news, map, onSelectSpot, onSelectNews]);

  return null;
}

// --- Main Page ---
export default function DangerMap() {
  const navigate = useNavigate();
  const [spots, setSpots] = useState<DangerSpot[]>([]);
  const [news, setNews] = useState<NewsAlert[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<DangerSpot | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Default to India center, but will update to user location
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);

  const load = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const s = await getDangerSpots(lat, lng, 10000); // 10km radius
      setSpots(Array.isArray(s) ? s : []);
      const n = await fetchSafetyNews();
      setNews(Array.isArray(n) ? n : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Detect User Location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          load(latitude, longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          load(mapCenter[0], mapCenter[1]); // Fallback to default
        }
      );
    } else {
      load(mapCenter[0], mapCenter[1]);
    }
  }, [load]);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <style>{`@keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(225,29,72,0.7); } 70% { box-shadow: 0 0 0 10px rgba(225,29,72,0); } 100% { box-shadow: 0 0 0 0 rgba(225,29,72,0); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #eee' }}>
        <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1, margin: '0 1rem' }}>Safety Radar</h1>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>{spots.length + news.length} Alerts</span>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={mapCenter} />
          <DangerMarkers spots={spots} news={news} onSelectSpot={setSelectedSpot} onSelectNews={setSelectedNews} />
          <MapClickHandler onLongPress={() => {}} />
        </MapContainer>
        {isLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', zIndex: 1000 }}>Locating & Scanning...</div>}
      </div>

      {(selectedSpot || selectedNews) && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', padding: '1.5rem', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', boxShadow: '0 -4px 15px rgba(0,0,0,0.1)', zIndex: 2000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700 }}>{selectedSpot ? 'Unsafe Spot' : selectedNews?.title}</div>
            <button style={{ background: '#eee', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }} onClick={() => { setSelectedSpot(null); setSelectedNews(null); }}>✕</button>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>{selectedSpot?.description || selectedNews?.description || 'No additional details.'}</p>
          {selectedNews && <Button fullWidth onClick={() => window.open(selectedNews.url, '_blank')}>Read News Report</Button>}
        </div>
      )}
    </div>
  );
}
