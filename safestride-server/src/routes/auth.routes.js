'use strict';

/**
 * auth.routes.js — F-03
 *
 * All authentication endpoints:
 *   POST /api/v1/auth/send-otp    — no auth required
 *   POST /api/v1/auth/verify-otp  — no auth required
 *   POST /api/v1/auth/refresh     — no auth required (uses cookie)
 *   POST /api/v1/auth/logout      — optionally authenticated
 */

const express    = require('express');
const controller = require('../controllers/auth.controller');
const validator  = require('../validators/auth.validator');
const { optionalAuthenticate } = require('../middleware/auth.middleware');
const rateLimit  = require('express-rate-limit');

const router = express.Router();

// ─── Route-level rate limiter for auth endpoints ──────────────────────────────
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              20,              // max 20 requests per window per IP
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { success: false, error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/send-otp
 * Send a 6-digit OTP to the provided phone number.
 */
router.post(
  '/send-otp',
  authLimiter,
  validator.validateSendOTP,
  controller.sendOTP
);

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and return access token + set refresh cookie.
 */
router.post(
  '/verify-otp',
  authLimiter,
  validator.validateVerifyOTP,
  controller.verifyOTP
);

/**
 * POST /api/v1/auth/refresh
 * Rotate refresh token and issue new access token.
 * Refresh token read from httpOnly cookie.
 */
router.post(
  '/refresh',
  controller.refreshToken
);

/**
 * POST /api/v1/auth/logout
 * Revoke refresh token and clear cookie.
 */
router.post(
  '/logout',
  optionalAuthenticate,
  validator.validateLogout,
  controller.logout
);

module.exports = router;