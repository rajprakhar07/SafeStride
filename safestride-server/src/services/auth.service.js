'use strict';

/**
 * auth.service.js — F-07
 * Shared auth utilities used across multiple features.
 * Currently: portal token generation for trusted contacts.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PORTAL_TOKEN_BYTES  = 32;   // 256-bit random token
const BCRYPT_ROUNDS       = 10;
const PORTAL_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Generate a cryptographically secure portal token.
 * Returns both the raw token (to send to the contact) and
 * the hashed version (to store in the database).
 *
 * @returns {{ rawToken: string, hashedToken: string, expiry: Date }}
 */
async function generatePortalToken() {
  const rawToken    = crypto.randomBytes(PORTAL_TOKEN_BYTES).toString('hex'); // 64-char hex string
  const hashedToken = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  const expiry      = new Date(Date.now() + PORTAL_TOKEN_TTL_MS);

  return { rawToken, hashedToken, expiry };
}

/**
 * Verify a submitted portal token against a stored hash.
 * @param {string} rawToken     — token from URL param
 * @param {string} hashedToken  — hash stored in DB
 * @returns {Promise<boolean>}
 */
async function verifyPortalToken(rawToken, hashedToken) {
  if (!rawToken || !hashedToken) return false;
  return bcrypt.compare(rawToken, hashedToken);
}

module.exports = { generatePortalToken, verifyPortalToken };