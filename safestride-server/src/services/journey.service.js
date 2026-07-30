'use strict';

/**
 * journey.service.js — F-10 (Updated to OpenRouteService - Final)
 *
 * Core business logic for journey lifecycle:
 *   - Fetch route from OpenRouteService (ORS) API (Free & Open Source)
 *   - Store/flush location pings (Redis → MongoDB)
 *   - Batch flush job management
 */

const axios          = require('axios');
const Journey        = require('../models/Journey');
const LocationPing   = require('../models/LocationPing');
const { getRedisClient } = require('../config/redis');
const config         = require('../config/environment');

const PING_REDIS_KEY   = (journeyId) => `journey:${journeyId}:pings`;
const PING_BATCH_SIZE  = 50;   // max pings buffered in Redis per journey
const FLUSH_INTERVAL_S = 60;   // flush to MongoDB every 60 seconds

/**
 * Fetch route from OpenRouteService (ORS) API.
 * Falls back to straight-line if no API key or request fails.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {string} mode — walking|auto|cab|bus|mixed
 * @returns {{ polyline: string|null, distanceMeters: number }}
 */
async function fetchRoute(origin, destination, mode = 'walking') {
  // Use ORS_API_KEY from your environment config
  const apiKey = config.ors?.apiKey || process.env.ORS_API_KEY;

  if (!apiKey || apiKey === 'your_ors_api_key_here') {
    const { haversineDistance } = require('../utils/geo.utils');
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    console.log('⚠  ORS API key not set — using straight-line route fallback');
    return { polyline: null, distanceMeters: Math.round(dist) };
  }

  try {
    // ORS Profiles: foot-walking, driving-car, cycling-regular, etc.
    const modeMap = { 
      walking: 'foot-walking', 
      auto:    'driving-car', 
      cab:     'driving-car', 
      bus:     'driving-car',
      mixed:   'foot-walking' 
    };
    const profile = modeMap[mode] || 'foot-walking';

    // Using the new recommended URL: api.heigit.org
    const url = `https://api.heigit.org/v2/directions/${profile}`;
    
    const { data } = await axios.get(url, {
      params: {
        api_key: apiKey,
        start:   `${origin.lng},${origin.lat}`, // ORS expects [longitude, latitude]
        end:     `${destination.lng},${destination.lat}`,
      },
      timeout: 5000,
    });

    if (!data.features?.length) {
      throw new Error('ORS API returned no routes');
    }

    const feature = data.features[0];
    const geometry = feature.geometry; // GeoJSON LineString
    const distanceMeters = feature.properties.summary.distance;

    return { 
      // Send GeoJSON coordinates as a string for the frontend to parse
      polyline: JSON.stringify(geometry.coordinates), 
      distanceMeters: Math.round(distanceMeters) 
    };
  } catch (err) {
    console.warn(`⚠  ORS API failed: ${err.message} — using straight-line fallback`);
    const { haversineDistance } = require('../utils/geo.utils');
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return { polyline: null, distanceMeters: Math.round(dist) };
  }
}

/**
 * Store a location ping in Redis and schedule batch flush.
 */
async function storePing(journeyId, userId, pingData) {
  const redis = getRedisClient();
  const key   = PING_REDIS_KEY(journeyId);

  const pingRecord = JSON.stringify({
    journeyId,
    userId,
    coordinates: { lat: pingData.lat, lng: pingData.lng },
    accuracy:     pingData.accuracy,
    speed:        pingData.speed ?? null,
    heading:      pingData.heading ?? null,
    batteryLevel: pingData.batteryLevel ?? null,
    timestamp:    pingData.timestamp ? new Date(pingData.timestamp) : new Date(),
    isAnomaly:    false,
  });

  await redis.rpush(key, pingRecord);
  await redis.expire(key, 2 * 60 * 60);

  const count = await redis.llen(key);
  if (count >= PING_BATCH_SIZE) {
    await flushPingsToMongoDB(journeyId);
  }
}

/**
 * Flush all buffered pings from Redis to MongoDB.
 */
async function flushPingsToMongoDB(journeyId) {
  const redis = getRedisClient();
  const key   = PING_REDIS_KEY(journeyId);

  const pipeline = redis.pipeline();
  pipeline.lrange(key, 0, -1);
  pipeline.del(key);
  const [[, rawPings]] = await pipeline.exec();

  if (!rawPings || rawPings.length === 0) return 0;

  const pings = rawPings.map((raw) => {
    try { return JSON.parse(raw); } catch { return null; }
  }).filter(Boolean);

  if (pings.length > 0) {
    await LocationPing.insertMany(pings, { ordered: false });
  }

  return pings.length;
}

/**
 * Get the latest ping for a journey from Redis (real-time).
 */
async function getLatestPing(journeyId) {
  try {
    const redis  = getRedisClient();
    const raw    = await redis.lindex(PING_REDIS_KEY(journeyId), -1);
    if (raw) {
      const ping = JSON.parse(raw);
      return ping.coordinates;
    }
  } catch { /* fallback to DB */ }

  const ping = await LocationPing
    .findOne({ journeyId })
    .sort({ timestamp: -1 })
    .select('coordinates')
    .lean();

  return ping?.coordinates || null;
}

module.exports = { fetchRoute, storePing, flushPingsToMongoDB, getLatestPing };
