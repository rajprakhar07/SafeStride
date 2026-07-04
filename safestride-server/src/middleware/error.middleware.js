'use strict';

/**
 * error.middleware.js — F-03
 *
 * Global error handler — must be the LAST middleware in app.js.
 * Catches all errors thrown by controllers/services via next(err).
 *
 * Usage in controllers:
 *   try { ... } catch(err) { next(err); }
 */

const config = require('../config/environment');

/**
 * Global error handler middleware.
 * Express identifies it as an error handler by the 4-argument signature (err, req, res, next).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log full error in development
  if (config.isDev) {
    console.error('─── Unhandled Error ───────────────────────────────');
    console.error(err);
    console.error('───────────────────────────────────────────────────');
  } else {
    console.error(`✖  ${req.method} ${req.path} — ${err.message}`);
  }

  // ── Mongoose validation error ──────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error:   messages.join(', '),
      code:    'VALIDATION_ERROR',
    });
  }

  // ── Mongoose duplicate key error ───────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error:   `${field} already exists`,
      code:    'DUPLICATE_KEY',
    });
  }

  // ── Mongoose CastError (invalid ObjectId) ─────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error:   `Invalid ${err.path}: ${err.value}`,
      code:    'INVALID_ID',
    });
  }

  // ── JWT errors (shouldn't reach here — caught in middleware, but just in case) ──
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error:   'Invalid or expired token',
      code:    'UNAUTHORIZED',
    });
  }

  // ── Default: 500 Internal Server Error ────────────────────────────────────
  return res.status(500).json({
    success: false,
    error:   config.isDev ? err.message : 'Internal server error',
    code:    'SERVER_ERROR',
  });
}

/**
 * 404 handler — for routes that don't exist.
 * Mount this BEFORE errorHandler but AFTER all routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error:   `Route ${req.method} ${req.path} not found`,
    code:    'NOT_FOUND',
  });
}

module.exports = { errorHandler, notFoundHandler };