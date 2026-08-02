'use strict';

/**
 * deviation.service.js — F-13
 *
 * Route deviation detection algorithm:
 *
 *   1. Every ping: calculate distance from user's location to planned route polyline
 *   2. If 3 consecutive pings are > 200m from route → deviation confirmed
 *   3. Store deviation record on journey document
 *   4. Emit journey:deviation via Socket.io to user's room
 *   5. Reset counter if user returns within 100m of route
 *
 * State is stored in Redis per journey to survive server restarts.
 * Redis key: deviation:{journeyId} → JSON { count, firstDeviationLocation }
 */

const Journey      = require('../models/Journey');
const { distanceFromPolyline} = require('../utils/geo.utils');
const { getRedisClient } = require('../config/redis');
const { emitToJourneyRoom, emitToPortalRoom } = require('../sockets');
const notificationService = require('./notification.service');
const TrustedContact = require('../models/TrustedContact');
const config = require('../config/environment');

// ─── Constants ────────────────────────────────────────────────────────────────
const DEVIATION_THRESHOLD_METERS  = 200;  // distance from route to count as off-route
const DEVIATION_CONFIRM_PINGS     = 3;    // consecutive pings needed to confirm deviation
const DEVIATION_RESET_METERS      = 100;  // distance to route to reset the counter
const DEVIATION_STATE_TTL_SECONDS = 2 * 60 * 60; // 2 hours (matches journey max TTL)

// Redis key for deviation state per journey
const deviationKey = (journeyId) => `deviation:${journeyId}`;

/**
 * Check a single location ping for route deviation.
 * Called by journey.socket.js on every location:ping event.
 *
 * @param {object} params
 * @param {string} params.journeyId
 * @param {string} params.userId
 * @param {{ lat: number, lng: number }} params.location — current ping location
 * @param {string|null} params.encodedPolyline — planned route polyline (null = no route)
 * @returns {Promise<{ isDeviation: boolean, deviationMeters: number|null }>}
 */
async function checkDeviation({ journeyId, userId, location, encodedPolyline }) {
  // If no route was planned, skip deviation detection
  if (!encodedPolyline) {
    return { isDeviation: false, deviationMeters: null };
  }

  const redis = getRedisClient();

  // Decode polyline to points array
 let routePoints;

try {
  // ORS stores GeoJSON coordinates
  const coordinates = JSON.parse(encodedPolyline);

  routePoints = coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }));
} catch {
  // fallback for Google encoded polyline
  routePoints = decodePolyline(encodedPolyline);
}

if (routePoints.length < 2) {
  console.log("❌ Route has too few points:", routePoints.length);
  return {
    isDeviation: false,
    deviationMeters: null,
  };
}

const distanceFromRoute = distanceFromPolyline(location, routePoints);

console.log("========== DEVIATION CHECK ==========");
console.log("Journey:", journeyId);
console.log("Current location:", location);
console.log("Polyline exists:", !!encodedPolyline);
console.log("Polyline length:", encodedPolyline?.length);
console.log("Decoded points:", routePoints.length);
console.log("Distance from route:", Math.round(distanceFromRoute), "meters");
console.log("====================================");

  // Calculate distance from current ping to nearest point on route
  
  console.log(`📍 Distance from route: ${Math.round(distanceFromRoute)}m`);

  // ── User is back on route — reset deviation counter ──────────────────────────
  if (distanceFromRoute <= DEVIATION_RESET_METERS) {
console.log("✅ ON ROUTE - resetting deviation counter");
console.log("Distance:", distanceFromRoute);

const stateRaw = await redis.get(deviationKey(journeyId));

console.log("Redis state:", stateRaw);
    await redis.del(deviationKey(journeyId));
    return { isDeviation: false, deviationMeters: Math.round(distanceFromRoute) };
  }

  // ── User is off route ─────────────────────────────────────────────────────────
  if (distanceFromRoute > DEVIATION_THRESHOLD_METERS) {
    // Get current deviation state from Redis
    const stateRaw = await redis.get(deviationKey(journeyId));
    let state = stateRaw
      ? JSON.parse(stateRaw)
      : { count: 0, firstDeviationLocation: null, alertSent: false };

    state.count++;

    // Record location of first off-route ping
    if (!state.firstDeviationLocation) {
      state.firstDeviationLocation = location;
    }

    // Save updated state to Redis
    await redis.set(
      deviationKey(journeyId),
      JSON.stringify(state),
      'EX',
      DEVIATION_STATE_TTL_SECONDS
    );

    // ── Deviation confirmed after N consecutive off-route pings ────────────────
    if (state.count >= DEVIATION_CONFIRM_PINGS && !state.alertSent) {
      // Mark alert as sent in Redis to prevent duplicate alerts
      state.alertSent = true;
      await redis.set(
        deviationKey(journeyId),
        JSON.stringify(state),
        'EX',
        DEVIATION_STATE_TTL_SECONDS
      );

      // Store deviation record on journey document
      const deviationRecord = {
        timestamp:       new Date(),
        location:        state.firstDeviationLocation,
        deviationMeters: Math.round(distanceFromRoute),
        alertSent:       true,
      };

      await Journey.findByIdAndUpdate(journeyId, {
        $push: { deviations: deviationRecord },
      });

      // Emit to user's journey room via Socket.io
      emitToJourneyRoom(journeyId, 'journey:deviation', {
        journeyId,
        deviationMeters: Math.round(distanceFromRoute),
        location:        state.firstDeviationLocation,
        timestamp:       new Date().toISOString(),
        message:         'You have deviated from your planned route.',
      });

      // Also emit to portal room (trusted contacts watching)
      emitToPortalRoom(journeyId, 'journey:deviation', {
        journeyId,
        deviationMeters: Math.round(distanceFromRoute),
        message:         'User has deviated from planned route.',
      });

    console.log(`⚠  Deviation detected — journey ${journeyId}, dist: ${Math.round(distanceFromRoute)}m`);

// Notify trusted contacts
const contact = await TrustedContact.findOne({
  userId,
  status: 'active',
}).lean();

const portalUrl = contact
  ? `${config.cors.frontendUrl}/portal/[see-invitation-link]`
  : config.cors.frontendUrl;

await notificationService.notifyDeviation(
  userId,
  journeyId,
  Math.round(distanceFromRoute),
  portalUrl
);

return {
  isDeviation: true,
  deviationMeters: Math.round(distanceFromRoute),
};
    }

    return {
      isDeviation:     false, // not yet confirmed (< 3 consecutive pings)
      deviationMeters: Math.round(distanceFromRoute),
    };
  }

  // Distance is between RESET and THRESHOLD — neutral zone, don't change state
  return { isDeviation: false, deviationMeters: Math.round(distanceFromRoute) };
}

/**
 * Reset deviation state for a journey (called on journey end).
 * @param {string} journeyId
 */
async function resetDeviationState(journeyId) {
  try {
    await getRedisClient().del(deviationKey(journeyId));
  } catch { /* non-critical */ }
}

/**
 * Get current deviation state for a journey (for debugging/admin).
 * @param {string} journeyId
 * @returns {Promise<object|null>}
 */
async function getDeviationState(journeyId) {
  try {
    const raw = await getRedisClient().get(deviationKey(journeyId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

module.exports = { checkDeviation, resetDeviationState, getDeviationState };