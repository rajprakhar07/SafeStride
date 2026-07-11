/**
 * SafeMap.tsx — F-12
 * Main Leaflet map component with live location dot and route overlay.
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '../../store/journeyStore';

// Fix Leaflet default marker icon issue with Vite
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl:     markerShadow,
});

interface SafeMapProps {
  center:          Coordinates;
  zoom?:           number;
  liveLocation?:   Coordinates | null;
  destination?:    Coordinates | null;
  polylinePoints?: Coordinates[];
  style?:          React.CSSProperties;
}

// ── Auto-pan to live location ─────────────────────────────────────────────────
function MapController({ center }: { center: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], undefined, { animate: true });
  }, [center.lat, center.lng, map]);
  return null;
}

// ── Live pulsing dot (pure CSS via divIcon) ───────────────────────────────────
function LiveDot({ position }: { position: Coordinates }) {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();

  useEffect(() => {
    const pulsingIcon = L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 20px; height: 20px;
        ">
          <div style="
            position: absolute; inset: 0;
            background: #E91E8C;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 0 0 2px #E91E8C;
            z-index: 2;
          "></div>
          <div style="
            position: absolute; inset: -6px;
            background: rgba(233,30,140,0.3);
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          "></div>
        </div>
      `,
      className: '',
      iconSize:  [20, 20],
      iconAnchor:[10, 10],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    } else {
      markerRef.current = L.marker([position.lat, position.lng], { icon: pulsingIcon })
        .addTo(map);
    }

    return () => { markerRef.current?.remove(); markerRef.current = null; };
  }, [position.lat, position.lng, map]);

  return null;
}

// ── Destination marker ────────────────────────────────────────────────────────
function DestinationMarker({ position }: { position: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    const icon = L.divIcon({
      html: `<div style="font-size:1.5rem;line-height:1;">📍</div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
    const marker = L.marker([position.lat, position.lng], { icon }).addTo(map);
    return () => { marker.remove(); };
  }, [position.lat, position.lng, map]);
  return null;
}

// ── Route polyline ────────────────────────────────────────────────────────────
function RoutePolyline({ points }: { points: Coordinates[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    const poly = L.polyline(latLngs, {
      color:   '#E91E8C',
      weight:  4,
      opacity: 0.7,
      dashArray: undefined,
    }).addTo(map);
    return () => { poly.remove(); };
  }, [points, map]);
  return null;
}

// ── Pulse animation style ─────────────────────────────────────────────────────
const pulseStyle = `
  @keyframes pulse {
    0%   { transform: scale(1);   opacity: 0.8; }
    50%  { transform: scale(1.5); opacity: 0.4; }
    100% { transform: scale(2);   opacity: 0;   }
  }
`;

// ── Main map component ────────────────────────────────────────────────────────
export default function SafeMap({
  center,
  zoom = 16,
  liveLocation,
  destination,
  polylinePoints = [],
  style,
}: SafeMapProps) {
  return (
    <>
      <style>{pulseStyle}</style>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%', ...style }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {liveLocation && <MapController center={liveLocation} />}
        {liveLocation && <LiveDot position={liveLocation} />}
        {destination  && <DestinationMarker position={destination} />}
        {polylinePoints.length >= 2 && <RoutePolyline points={polylinePoints} />}
      </MapContainer>
    </>
  );
}