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
app.disable('x-powered-by');

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'https://safe-stride-five.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without Origin (Postman, Render health checks, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
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
const path = require('path' );
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../safestride-client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}


module.exports = app;