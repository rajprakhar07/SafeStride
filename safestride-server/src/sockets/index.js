'use strict';

/**
 * sockets/index.js — F-11
 *
 * Socket.io setup and namespace configuration.
 * Attaches to the existing HTTP server.
 *
 * Namespaces:
 *   /journey  — real-time location tracking (JWT auth)
 *   /portal   — trusted contact live view (portal token auth) — F-15
 */

const { Server }         = require('socket.io');
const { verifyAccessToken } = require('../utils/token.utils');
const User               = require('../models/User');
const config             = require('../config/environment');

let io;

/**
 * Initialize Socket.io on the HTTP server.
 * Called from server.js after express app is ready.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      config.cors.frontendUrl,
      credentials: true,
      methods:     ['GET', 'POST'],
    },
    transports:        ['websocket', 'polling'],
    pingTimeout:       60_000,
    pingInterval:      25_000,
    upgradeTimeout:    30_000,
    allowEIO3:         true,
  });

  // ── /journey namespace ───────────────────────────────────────────────────────
  const journeyNS = io.of('/journey');

  // JWT authentication middleware for the journey namespace
  journeyNS.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      const user    = await User.findOne({
        _id:      payload.userId,
        isActive: true,
        deletedAt: null,
      }).lean();

      if (!user) return next(new Error('User not found'));

      // Attach user to socket for use in event handlers
      socket.user   = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Register journey event handlers
  require('./journey.socket')(journeyNS);

  // ── /portal namespace ─────────────────────────────────────────────────────────
  // Implemented in F-15 — stub namespace registered here to prevent errors
  const portalNS = io.of('/portal');
  portalNS.use((_socket, next) => next()); // no auth yet — F-15 adds it
  portalNS.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });

  console.log('✔  Socket.io initialized — namespaces: /journey, /portal');
  return io;
}

/**
 * Get the Socket.io server instance.
 * Used by controllers/services to emit events.
 */
function getIO() {
  if (!io) throw new Error('Socket.io not initialized. Call initSocketIO() first.');
  return io;
}

/**
 * Emit an event to all sockets in a journey room.
 * @param {string} journeyId
 * @param {string} event
 * @param {object} data
 */
function emitToJourneyRoom(journeyId, event, data) {
  if (!io) return;
  io.of('/journey').to(`journey:${journeyId}`).emit(event, data);
}

/**
 * Emit an event to all sockets in a portal room.
 * @param {string} journeyId
 * @param {string} event
 * @param {object} data
 */
function emitToPortalRoom(journeyId, event, data) {
  if (!io) return;
  io.of('/portal').to(`portal:${journeyId}`).emit(event, data);
}

module.exports = { initSocketIO, getIO, emitToJourneyRoom, emitToPortalRoom };