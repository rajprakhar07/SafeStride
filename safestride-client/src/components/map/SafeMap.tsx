/**
 * SafeMap.tsx — updated with News Alerts
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Coordinates } from '../../store/journeyStore';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

export interface NewsMarkerData {
  title:    string;
  content:  string;
  location: Coordinates;
}

interface SafeMapProps {
  center:          Coordinates;
  zoom?:           number;
  liveLocation?:   Coordinates | null;
  destination?:    Coordinates | null;
  polylinePoints?: Coordinates[];
  deviationSpot?:  Coordinates | null;
  newsAlerts?:     NewsMarkerData[]; // New prop for news alerts
  style?:          React.CSSProperties;
}

function MapController({ center }: { center: Coordinates }) {
  const map = useMap();
  useEffect(() => { map.setView([center.lat, center.lng], undefined, { animate: true }); }, [center.lat, center.lng, map]);
  return null;
}

function LiveDot({ position }: { position: Coordinates }) {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({
      html: `<div style="position:relative;width:20px;height:20px">
        <div style="position:absolute;inset:0;background:#E91E8C;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #E91E8C;z-index:2"></div>
        <div style="position:absolute;inset:-6px;background:rgba(233,30,140,0.3);border-radius:50%;animation:pulse 1.5s infinite"></div>
      </div>`,
      className: '', iconSize: [20, 20], iconAnchor: [10, 10],
    });
    if (markerRef.current) { markerRef.current.setLatLng([position.lat, position.lng]); }
    else { markerRef.current = L.marker([position.lat, position.lng], { icon }).addTo(map); }
    return () => { markerRef.current?.remove(); markerRef.current = null; };
  }, [position.lat, position.lng, map]);
  return null;
}

function DestinationMarker({ position }: { position: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({ html: `<div style="font-size:1.5rem;line-height:1">📍</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 24] });
    const marker = L.marker([position.lat, position.lng], { icon }).addTo(map);
    return () => { marker.remove(); };
  }, [position.lat, position.lng, map]);
  return null;
}

function DeviationMarker({ position }: { position: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({
      html: `<div style="
        background:#F59E0B;color:#fff;border-radius:50%;
        width:28px;height:28px;display:flex;align-items:center;
        justify-content:center;font-size:14px;
        border:2px solid #fff;box-shadow:0 2px 8px rgba(245,158,11,0.5);
      ">⚠</div>`,
      className: '', iconSize: [28, 28], iconAnchor: [14, 14],
    });
    const marker = L.marker([position.lat, position.lng], { icon })
      .bindPopup('Route deviation detected here')
      .addTo(map);
    return () => { marker.remove(); };
  }, [position.lat, position.lng, map]);
  return null;
}

/**
 * NewsMarker: Displays a news-based danger alert on the map
 */
function NewsMarker({ data }: { data: NewsMarkerData }) {
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({
      html: `<div style="
        background:#E11D48;color:#fff;border-radius:10px;
        width:32px;height:32px;display:flex;align-items:center;
        justify-content:center;font-size:18px;
        border:2px solid #fff;box-shadow:0 2px 10px rgba(225,29,72,0.6);
        animation: pulse-red 2s infinite;
      ">📰</div>`,
      className: '', iconSize: [32, 32], iconAnchor: [16, 16],
    });
    const marker = L.marker([data.location.lat, data.location.lng], { icon })
      .bindPopup(`<strong>${data.title}</strong><br/>${data.content}`)
      .addTo(map);
    return () => { marker.remove(); };
  }, [data, map]);
  return null;
}

function RoutePolyline({ points }: { points: Coordinates[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const poly = L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]), { color: '#E91E8C', weight: 4, opacity: 0.7 }).addTo(map);
    return () => { poly.remove(); };
  }, [points, map]);
  return null;
}

const pulseStyle = `
@keyframes pulse { 0% { transform:scale(1);opacity:0.8 } 50% { transform:scale(1.5);opacity:0.4 } 100% { transform:scale(2);opacity:0 } }
@keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(225,29,72,0.7); } 70% { box-shadow: 0 0 0 10px rgba(225,29,72,0); } 100% { box-shadow: 0 0 0 0 rgba(225,29,72,0); } }
`;

export default function SafeMap({ center, zoom = 16, liveLocation, destination, polylinePoints = [], deviationSpot, newsAlerts = [], style }: SafeMapProps) {
  return (
    <>
      <style>{pulseStyle}</style>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ width: '100%', height: '100%', ...style }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' />
        {liveLocation && <MapController center={liveLocation} />}
        {liveLocation && <LiveDot position={liveLocation} />}
        {destination   && <DestinationMarker position={destination} />}
        {deviationSpot && <DeviationMarker position={deviationSpot} />}
        {newsAlerts.map((alert, idx) => <NewsMarker key={idx} data={alert} />)}
        {polylinePoints.length >= 2 && <RoutePolyline points={polylinePoints} />}
      </MapContainer>
    </>
  );
}
