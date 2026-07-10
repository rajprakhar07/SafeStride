'use strict';

/**
 * geo.utils.js — F-10
 *
 * Geospatial utility functions:
 *   - Haversine distance between two coordinates
 *   - Google Maps encoded polyline decoder
 *   - Point-to-polyline distance (for deviation detection in F-13)
 *   - Bearing calculation
 */

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Convert degrees to radians.
 */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine formula — great-circle distance between two points.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in meters
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Decode a Google Maps encoded polyline string into an array of { lat, lng } objects.
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * @param {string} encoded — encoded polyline string
 * @returns {Array<{lat: number, lng: number}>}
 */
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    // Reset for longitude
    shift = 0;
    result = 0;

    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Calculate the perpendicular distance from a point to a line segment.
 * Used for deviation detection in F-13.
 *
 * @param {{ lat: number, lng: number }} point
 * @param {{ lat: number, lng: number }} segStart
 * @param {{ lat: number, lng: number }} segEnd
 * @returns {number} distance in meters
 */
function pointToSegmentDistance(point, segStart, segEnd) {
  const dx = segEnd.lng - segStart.lng;
  const dy = segEnd.lat - segStart.lat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineDistance(point.lat, point.lng, segStart.lat, segStart.lng);
  }

  // Parameter t of projection onto the line segment, clamped to [0, 1]
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - segStart.lng) * dx + (point.lat - segStart.lat) * dy) / lenSq
    )
  );

  const closestPoint = {
    lat: segStart.lat + t * dy,
    lng: segStart.lng + t * dx,
  };

  return haversineDistance(point.lat, point.lng, closestPoint.lat, closestPoint.lng);
}

/**
 * Find the minimum distance from a point to any segment of a polyline.
 * Used to check if user is still on their planned route.
 *
 * @param {{ lat: number, lng: number }} point
 * @param {Array<{lat: number, lng: number}>} polylinePoints
 * @returns {number} minimum distance in meters
 */
function distanceFromPolyline(point, polylinePoints) {
  if (!polylinePoints || polylinePoints.length === 0) return Infinity;
  if (polylinePoints.length === 1) {
    return haversineDistance(point.lat, point.lng, polylinePoints[0].lat, polylinePoints[0].lng);
  }

  let minDist = Infinity;
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const dist = pointToSegmentDistance(point, polylinePoints[i], polylinePoints[i + 1]);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/**
 * Calculate bearing (direction) from point A to point B.
 * @returns {number} bearing in degrees (0-360)
 */
function bearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Calculate total distance of a polyline in meters.
 * @param {Array<{lat: number, lng: number}>} points
 * @returns {number} total distance in meters
 */
function polylineDistance(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  return total;
}

module.exports = {
  haversineDistance,
  decodePolyline,
  distanceFromPolyline,
  pointToSegmentDistance,
  bearing,
  polylineDistance,
};