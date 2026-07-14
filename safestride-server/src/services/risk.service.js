'use strict';

/**
 * risk.service.js — F-23
 * Calls the Python AI microservice for route risk scoring.
 * Caches results in Redis for 1 hour.
 */

const axios          = require('axios');
const { getRedisClient } = require('../config/redis');
const config         = require('../config/environment');
const DangerSpot     = require('../models/DangerSpot');
const { haversineDistance } = require('../utils/geo.utils');

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Generate cache key for a route score request.
 */
function cacheKey(originLat, originLng, destLat, destLng, mode, hour) {
  return `risk:route:${originLat.toFixed(3)}:${originLng.toFixed(3)}:${destLat.toFixed(3)}:${destLng.toFixed(3)}:${mode}:${hour}`;
}

/**
 * Count danger spots within a given radius of route midpoint.
 * Used as input to the AI risk model.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {number} radiusMeters
 * @returns {Promise<number>}
 */
async function countDangerSpotsNearRoute(origin, destination, radiusMeters = 500) {
  try {
    // Use midpoint of route for proximity check
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;

    const spots = await DangerSpot.find({
      isActive: true,
      location: {
        $near: {
          $geometry:    { type: 'Point', coordinates: [midLng, midLat] },
          $maxDistance: radiusMeters,
        },
      },
    }).countDocuments();

    return spots;
  } catch {
    return 0; // non-critical — return 0 if query fails
  }
}

/**
 * Score a route using the Python AI microservice.
 *
 * @param {object} params
 * @param {{ lat: number, lng: number }} params.origin
 * @param {{ lat: number, lng: number }} params.destination
 * @param {string} params.transportMode
 * @param {number} [params.routeLengthMeters]
 * @param {Date} [params.atTime] — time to score for (default: now)
 * @returns {Promise<{ riskScore: number, riskLevel: string, factors: array, recommendation: string }>}
 */
async function scoreRoute({ origin, destination, transportMode, routeLengthMeters, atTime }) {
  const now     = atTime || new Date();
  const hour    = now.getHours();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // convert JS (0=Sun) to Python (0=Mon)

  // Check Redis cache first
  const redis = getRedisClient();
  const key   = cacheKey(origin.lat, origin.lng, destination.lat, destination.lng, transportMode, hour);

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch { /* cache miss — proceed to AI service */ }

  // Count nearby danger spots
  const dangerSpotCount = await countDangerSpotsNearRoute(origin, destination);

  // Estimate route length if not provided
  const routeLength = routeLengthMeters || haversineDistance(
    origin.lat, origin.lng,
    destination.lat, destination.lng
  );

  // Call Python AI microservice
  const aiUrl = config.aiService?.url || 'http://localhost:8000';

  try {
    const { data } = await axios.post(`${aiUrl}/risk/score-route`, {
      origin_lat:          origin.lat,
      origin_lng:          origin.lng,
      dest_lat:            destination.lat,
      dest_lng:            destination.lng,
      hour_of_day:         hour,
      day_of_week:         dayOfWeek,
      transport_mode:      transportMode,
      route_length_meters: routeLength,
      danger_spot_count:   dangerSpotCount,
    }, { timeout: 5000 });

    const result = {
      riskScore:      data.risk_score,
      riskLevel:      data.risk_level,
      factors:        data.factors,
      recommendation: data.recommendation,
      dangerSpotCount,
    };

    // Cache result
    try {
      await redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    } catch { /* non-critical */ }

    return result;
  } catch (err) {
    console.warn(`⚠  AI service unavailable: ${err.message} — using fallback score`);

    // Fallback: simple time-based score if AI service is down
    const isSafeHour = hour >= 6 && hour <= 20;
    const fallback = {
      riskScore:      isSafeHour ? 25 : 65,
      riskLevel:      isSafeHour ? 'safe' : 'moderate',
      factors:        [],
      recommendation: isSafeHour
        ? 'AI service unavailable. Route appears safe based on time of day.'
        : 'AI service unavailable. Exercise caution — it is late.',
      dangerSpotCount,
      isFallback:     true,
    };
    return fallback;
  }
}

module.exports = { scoreRoute, countDangerSpotsNearRoute };