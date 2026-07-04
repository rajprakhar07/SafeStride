'use strict';

/**
 * app.js — updated in F-03
 * Adds: cookie-parser, routes, 404 handler, global error handler
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const config       = require('./config/environment');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      config.cors.frontendUrl,
  credentials: true, // required for httpOnly cookie to be sent cross-origin
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // needed to read req.cookies.refreshToken

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health check (no auth) ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    project: 'SafeStride',
    version: '1.0.0',
    status:  'ok',
    uptime:  Math.floor(process.uptime()) + 's',
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', require('./routes'));

// ─── 404 + Global error handler (must be LAST) ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;