'use strict';

/**
 * redis.js — F-01
 *
 * Creates and exports a single shared ioredis client.
 * Runs PING on startup and logs "Redis connected: PONG".
 * All Redis operations in the app import this client — never create their own.
 *
 * Error handling:
 *   - ioredis has built-in reconnect logic (retryStrategy below).
 *   - Fatal connection failures are caught in connectRedis() and re-thrown
 *     so server.js can exit cleanly.
 */

const Redis  = require('ioredis');
const config = require('./environment');

// ─── Retry strategy ───────────────────────────────────────────────────────────
/**
 * Called by ioredis before every reconnect attempt.
 * @param {number} times – number of attempts so far
 * @returns {number|null} ms to wait before next retry, or null to stop retrying
 */
function retryStrategy(times) {
  const MAX_RETRY_ATTEMPTS = 5;
  if (times > MAX_RETRY_ATTEMPTS) {
    console.error(`✖  Redis: giving up after ${MAX_RETRY_ATTEMPTS} reconnect attempts`);
    return null; // stop retrying — triggers 'error' event with ReconnectFailedError
  }
  const delay = Math.min(1_000 * Math.pow(2, times - 1), 16_000); // cap at 16 s
  console.warn(`⚠  Redis reconnect attempt ${times}/${MAX_RETRY_ATTEMPTS} in ${delay / 1_000}s…`);
  return delay;
}

// ─── Client singleton ─────────────────────────────────────────────────────────
let client;

function createClient() {
  return new Redis(config.redis.url, {
    retryStrategy,
    lazyConnect: true,        // don't auto-connect — we call connect() explicitly
    maxRetriesPerRequest: 3,  // fail fast on individual commands when disconnected
    enableReadyCheck: true,
    connectTimeout: 10_000,
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Connect to Redis and verify with PING.
 * Must be awaited in server.js before HTTP server starts.
 *
 * @throws {Error} if PING fails or connection is refused
 */
async function connectRedis() {
  client = createClient();

  // Surface errors that happen outside of a command (e.g. mid-life disconnects)
  client.on('error', (err) => {
    // Only log — ioredis will attempt reconnect per retryStrategy
    console.error('✖  Redis error:', err.message);
  });

  client.on('reconnecting', () => {
    console.warn('⚠  Redis reconnecting…');
  });

  client.on('ready', () => {
    // Fires on initial connect AND after each successful reconnect
    if (!client._safestridePinged) return; // suppress duplicate ready log after ping
    console.log('✔  Redis reconnected and ready');
  });

  // Explicit connect (lazyConnect: true)
  await client.connect();

  // Startup PING — confirms the server is reachable and responding
  const pong = await client.ping();
  client._safestridePinged = true;
  console.log(`✔  Redis connected: ${pong}`); // "Redis connected: PONG"

  return client;
}

/**
 * Gracefully disconnect the Redis client.
 * Called during SIGTERM / SIGINT shutdown.
 */
async function disconnectRedis() {
  if (client) {
    await client.quit();
    console.log('✔  Redis connection closed');
  }
}

/**
 * Return the shared Redis client.
 * Throws if connectRedis() has not been called yet (programming error guard).
 *
 * @returns {import('ioredis').Redis}
 */
function getRedisClient() {
  if (!client) {
    throw new Error(
      'Redis client not initialised. Call connectRedis() before using getRedisClient().'
    );
  }
  return client;
}

module.exports = { connectRedis, disconnectRedis, getRedisClient };
