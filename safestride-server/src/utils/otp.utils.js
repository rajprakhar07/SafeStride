'use strict';

/**
 * otp.utils.js — F-03
 *
 * OTP generation, storage (Redis), and verification.
 *
 * Redis key pattern : otp:{phone}          → stores the hashed OTP
 * Redis key pattern : otp:attempts:{phone} → stores attempt count (rate limit)
 *
 * Security:
 *   - OTP is hashed with bcrypt before storing (prevents Redis dump attacks)
 *   - Max 3 OTP requests per phone per 10 minutes
 *   - Max 5 verification attempts per OTP before lock
 *   - Constant-time comparison via bcrypt (prevents timing attacks)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getRedisClient } = require('../config/redis');

const OTP_TTL_SECONDS       = 10 * 60;  // 10 minutes
const OTP_RATE_LIMIT_MAX    = 3;         // max OTP sends per window
const OTP_RATE_WINDOW_SEC   = 10 * 60;  // 10 minute window
const OTP_VERIFY_MAX        = 5;         // max wrong attempts before lock
const BCRYPT_ROUNDS         = 10;

// Redis key helpers
const otpKey          = (phone) => `otp:${phone}`;
const rateLimitKey    = (phone) => `otp:rate:${phone}`;
const attemptsKey     = (phone) => `otp:attempts:${phone}`;

/**
 * Generate a cryptographically secure 6-digit OTP.
 * @returns {string} 6-digit string e.g. "048271"
 */
function generateOTP() {
  // crypto.randomInt is cryptographically secure (no modulo bias)
  const otp = crypto.randomInt(100000, 999999);
  return String(otp);
}

/**
 * Check rate limit — max 3 OTP sends per phone per 10 minutes.
 * @param {string} phone
 * @returns {Promise<{allowed: boolean, remaining: number, ttl: number}>}
 */
async function checkRateLimit(phone) {
  const redis = getRedisClient();
  const key   = rateLimitKey(phone);
  const count = await redis.incr(key);

  if (count === 1) {
    // First request — set TTL on the key
    await redis.expire(key, OTP_RATE_WINDOW_SEC);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed:   count <= OTP_RATE_LIMIT_MAX,
    remaining: Math.max(0, OTP_RATE_LIMIT_MAX - count),
    ttl,
    count,
  };
}

/**
 * Store a hashed OTP in Redis with TTL.
 * Deletes any previous OTP for this phone first.
 * @param {string} phone
 * @param {string} otp  — plain-text OTP (will be hashed before storing)
 */
async function storeOTP(phone, otp) {
  const redis  = getRedisClient();
  const hashed = await bcrypt.hash(otp, BCRYPT_ROUNDS);

  const pipeline = redis.pipeline();
  pipeline.set(otpKey(phone), hashed, 'EX', OTP_TTL_SECONDS);
  pipeline.del(attemptsKey(phone)); // reset attempt counter on new OTP
  await pipeline.exec();
}

/**
 * Verify a submitted OTP against the stored hash.
 * Tracks wrong attempts and locks after OTP_VERIFY_MAX failures.
 *
 * @param {string} phone
 * @param {string} submittedOTP — plain-text OTP from user
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
async function verifyOTP(phone, submittedOTP) {
  const redis  = getRedisClient();
  const stored = await redis.get(otpKey(phone));

  if (!stored) {
    return { valid: false, reason: 'OTP expired or not found' };
  }

  // Check attempt count before comparing (prevent brute force)
  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) {
    await redis.expire(attemptsKey(phone), OTP_TTL_SECONDS);
  }

  if (attempts > OTP_VERIFY_MAX) {
    // Too many wrong attempts — invalidate the OTP
    await redis.del(otpKey(phone));
    return { valid: false, reason: 'Too many incorrect attempts. Request a new OTP.' };
  }

  // Constant-time comparison via bcrypt
  const match = await bcrypt.compare(submittedOTP, stored);

  if (!match) {
    const remaining = OTP_VERIFY_MAX - attempts;
    return {
      valid:  false,
      reason: remaining > 0
        ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Request a new OTP.',
    };
  }

  // OTP is valid — delete it immediately (one-time use)
  const pipeline = redis.pipeline();
  pipeline.del(otpKey(phone));
  pipeline.del(attemptsKey(phone));
  await pipeline.exec();

  return { valid: true };
}

/**
 * Delete OTP and rate limit keys for a phone (used in tests / admin).
 * @param {string} phone
 */
async function clearOTP(phone) {
  const redis = getRedisClient();
  await redis.del(otpKey(phone), rateLimitKey(phone), attemptsKey(phone));
}

module.exports = { generateOTP, checkRateLimit, storeOTP, verifyOTP, clearOTP };