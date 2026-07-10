'use strict';

/**
 * journey.service.js — F-10
 *
 * Core business logic for journey lifecycle:
 *   - Fetch route from Google Directions API (or fallback straight-line)
 *   - Store/flush location pings (Redis → MongoDB)
 *   - Batch flush job management
 */

const axios          = require('axios');
const Journey        = require('../models/Journey');
const LocationPing   = require('../models/LocationPing');
const { getRedisClient } = require('../config/redis');
const { decodePolyline, polylineDistance } = require('../utils/geo.utils');
const { calculateETA } = require('./eta.service');
const config         = require('../config/environment');

const PING_REDIS_KEY   = (journeyId) => `journey:${journeyId}:pings`;
const PING_BATCH_SIZE  = 50;   // max pings buffered in Redis per journey
const FLUSH_INTERVAL_S = 60;   // flush to MongoDB every 60 seconds

/**
 * Fetch route from Google Directions API.
 * Falls back to straight-line if no API key or request fails.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {string} mode — walking|driving|transit
 * @returns {{ polyline: string|null, distanceMeters: number }}
 */
async function fetchRoute(origin, destination, mode = 'walking') {
  const apiKey = config.googleMaps?.apiKey;

  if (!apiKey || apiKey === 'AIzaSy_your_google_maps_api_key') {
    // No API key — use straight-line distance as fallback
    const { haversineDistance } = require('../utils/geo.utils');
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    console.log('⚠  Google Maps API key not set — using straight-line route fallback');
    return { polyline: null, distanceMeters: Math.round(dist) };
  }

  try {
    const modeMap = { walking: 'walking', auto: 'driving', cab: 'driving', bus: 'transit', mixed: 'walking' };
    const gmMode  = modeMap[mode] || 'walking';

    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const { data } = await axios.get(url, {
      params: {
        origin:      `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode:        gmMode,
        key:         apiKey,
      },
      timeout: 5000,
    });

    if (data.status !== 'OK' || !data.routes?.length) {
      throw new Error(`Directions API returned: ${data.status}`);
    }

    const route    = data.routes[0];
    const polyline = route.overview_polyline.points;
    const distanceMeters = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);

    return { polyline, distanceMeters };
  } catch (err) {
    console.warn(`⚠  Directions API failed: ${err.message} — using straight-line fallback`);
    const { haversineDistance } = require('../utils/geo.utils');
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return { polyline: null, distanceMeters: Math.round(dist) };
  }
}

/**
 * Store a location ping in Redis and schedule batch flush.
 *
 * @param {string} journeyId
 * @param {string} userId
 * @param {object} pingData — { lat, lng, accuracy, speed, heading, batteryLevel, timestamp }
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

  // RPUSH — append to list; set TTL of 2 hours (pings flushed to DB every 60s)
  await redis.rpush(key, pingRecord);
  await redis.expire(key, 2 * 60 * 60);

  // If buffer is full, flush immediately
  const count = await redis.llen(key);
  if (count >= PING_BATCH_SIZE) {
    await flushPingsToMongoDB(journeyId);
  }
}

/**
 * Flush all buffered pings from Redis to MongoDB.
 * Called every 60 seconds by the dead man's switch cron job.
 *
 * @param {string} journeyId
 * @returns {number} number of pings flushed
 */
async function flushPingsToMongoDB(journeyId) {
  const redis = getRedisClient();
  const key   = PING_REDIS_KEY(journeyId);

  // Atomically get all pings and delete the key
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
 * Falls back to MongoDB if Redis is empty.
 *
 * @param {string} journeyId
 * @returns {{ lat: number, lng: number } | null}
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