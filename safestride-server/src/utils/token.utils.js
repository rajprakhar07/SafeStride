'use strict';

/**
 * token.utils.js — F-03
 *
 * JWT access token + refresh token generation and verification.
 *
 * Access token  : short-lived (15 min), stored in memory on client
 * Refresh token : long-lived (30 days), stored in Redis + httpOnly cookie
 *
 * Refresh token rotation:
 *   - Each refresh issues a brand-new refresh token
 *   - Old refresh token is deleted from Redis immediately
 *   - Prevents refresh token reuse attacks
 *
 * Redis key pattern: refresh:{userId}:{tokenId} → "1" (exists = valid)
 */

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');
const config = require('../config/environment');

const REFRESH_KEY_PREFIX = 'refresh';

// Redis key for a specific refresh token
const refreshKey = (userId, tokenId) => `${REFRESH_KEY_PREFIX}:${userId}:${tokenId}`;

/**
 * Generate a JWT access token.
 * Payload: { userId, phone }
 * @param {object} user — mongoose User document
 * @returns {string} signed JWT
 */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), phone: user.phone },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn, issuer: 'safestride' }
  );
}

/**
 * Generate a refresh token and store it in Redis.
 * @param {object} user — mongoose User document
 * @returns {Promise<string>} signed JWT refresh token
 */
async function generateRefreshToken(user) {
  const tokenId = crypto.randomUUID(); // unique ID for this refresh token
  const userId  = user._id.toString();

  const token = jwt.sign(
    { userId, tokenId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn, issuer: 'safestride' }
  );

  // Store in Redis — key existence = valid token
  const ttlSeconds = 30 * 24 * 60 * 60; // 30 days
  await getRedisClient().set(refreshKey(userId, tokenId), '1', 'EX', ttlSeconds);

  return token;
}

/**
 * Verify a JWT access token.
 * @param {string} token
 * @returns {{ userId: string, phone: string }} decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: 'safestride' });
}

/**
 * Verify a refresh token AND check it exists in Redis.
 * @param {string} token
 * @returns {Promise<{ userId: string, tokenId: string }>}
 * @throws {Error} if invalid, expired, or already revoked
 */
async function verifyRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret, { issuer: 'safestride' });
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }

  const { userId, tokenId } = payload;
  const exists = await getRedisClient().exists(refreshKey(userId, tokenId));

  if (!exists) {
    throw new Error('Refresh token has been revoked');
  }

  return { userId, tokenId };
}

/**
 * Rotate refresh token:
 *   1. Delete old token from Redis
 *   2. Issue new token and store it
 * @param {string} oldToken — the current refresh token
 * @param {object} user
 * @returns {Promise<string>} new refresh token
 */
async function rotateRefreshToken(oldToken, user) {
  // Decode without verify (we already verified above) to get tokenId
  const payload = jwt.decode(oldToken);
  if (payload?.tokenId && payload?.userId) {
    await getRedisClient().del(refreshKey(payload.userId, payload.tokenId));
  }
  return generateRefreshToken(user);
}

/**
 * Revoke a specific refresh token (logout).
 * @param {string} token
 */
async function revokeRefreshToken(token) {
  try {
    const payload = jwt.decode(token);
    if (payload?.userId && payload?.tokenId) {
      await getRedisClient().del(refreshKey(payload.userId, payload.tokenId));
    }
  } catch {
    // Silently ignore decode errors on logout
  }
}

/**
 * Revoke ALL refresh tokens for a user (logout everywhere).
 * @param {string} userId
 */
async function revokeAllRefreshTokens(userId) {
  const redis  = getRedisClient();
  const keys   = await redis.keys(`${REFRESH_KEY_PREFIX}:${userId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Set refresh token as httpOnly cookie on the response.
 * @param {object} res — Express response
 * @param {string} token
 */
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

/**
 * Clear the refresh token cookie.
 * @param {object} res — Express response
 */
function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'none',
  path: '/api/v1/auth',
});
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
};