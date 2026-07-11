'use strict';

/**
 * sockets/index.js — updated in F-15
 * Wires /portal namespace with full auth and event handlers.
 */

const { Server }            = require('socket.io');
const { verifyAccessToken } = require('../utils/token.utils');
const User                  = require('../models/User');
const config                = require('../config/environment');

let io;

function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      config.cors.frontendUrl,
      credentials: true,
      methods:     ['GET', 'POST'],
    },
    transports:     ['websocket', 'polling'],
    pingTimeout:    60_000,
    pingInterval:   25_000,
    upgradeTimeout: 30_000,
    allowEIO3:      true,
  });

  // ── /journey namespace (JWT auth) ─────────────────────────────────────────────
  const journeyNS = io.of('/journey');

  journeyNS.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication token required'));

      const payload = verifyAccessToken(token);
      const user    = await User.findOne({ _id: payload.userId, isActive: true, deletedAt: null }).lean();
      if (!user) return next(new Error('User not found'));

      socket.user   = user;
      socket.userId = user._id.toString();
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  require('./journey.socket')(journeyNS);

  // ── /portal namespace (portal token auth) ─────────────────────────────────────
  const portalNS = io.of('/portal');
  require('./portal.socket')(portalNS);

  console.log('✔  Socket.io initialized — namespaces: /journey, /portal');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized. Call initSocketIO() first.');
  return io;
}

function emitToJourneyRoom(journeyId, event, data) {
  if (!io) return;
  io.of('/journey').to(`journey:${journeyId}`).emit(event, data);
}

function emitToPortalRoom(journeyId, event, data) {
  if (!io) return;
  io.of('/portal').to(`portal:${journeyId}`).emit(event, data);
}

module.exports = { initSocketIO, getIO, emitToJourneyRoom, emitToPortalRoom };