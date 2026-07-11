'use strict';

/**
 * portal.socket.js — F-15
 *
 * Socket.io /portal namespace — trusted contacts join to watch live journey.
 * Auth: portal token in handshake (no JWT).
 *
 * Client → Server:
 *   portal:join  { token, journeyId }
 *
 * Server → Client:
 *   location:update  { lat, lng, eta, remainingMeters, remainingMinutes }
 *   journey:ended    { journeyId, status }
 *   journey:deviation { journeyId, deviationMeters }
 *   portal:joined    { journeyId, userName }
 */

const TrustedContact     = require('../models/TrustedContact');
const Journey            = require('../models/Journey');
const User               = require('../models/User');
const { verifyPortalToken } = require('../services/auth.service');

module.exports = function registerPortalSocket(portalNS) {
  // Auth middleware — validate portal token from handshake
  portalNS.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        // Allow connection without token — they'll join with token on portal:join event
        socket.isAuthenticated = false;
        return next();
      }

      // Verify token
      const contacts = await TrustedContact.find({ status: { $in: ['pending', 'active'] } }).lean();
      for (const contact of contacts) {
        if (contact.portalToken && await verifyPortalToken(token, contact.portalToken)) {
          socket.contactId = contact._id.toString();
          socket.userId    = contact.userId.toString();
          socket.isAuthenticated = true;
          break;
        }
      }

      next();
    } catch {
      next(); // allow connection even if auth fails — they can join with token event
    }
  });

  portalNS.on('connection', (socket) => {
    // ── portal:join ────────────────────────────────────────────────────────────
    socket.on('portal:join', async ({ token, journeyId } = {}) => {
      try {
        if (!token) {
          return socket.emit('error', { message: 'Portal token required' });
        }

        if (!journeyId) {
          return socket.emit('error', { message: 'journeyId required' });
        }

        // Verify token if not already authenticated
        if (!socket.isAuthenticated) {
          const contacts = await TrustedContact.find({ status: { $in: ['pending', 'active'] } }).lean();
          let matched = null;
          for (const contact of contacts) {
            if (contact.portalToken && await verifyPortalToken(token, contact.portalToken)) {
              matched = contact;
              break;
            }
          }
          if (!matched) return socket.emit('error', { message: 'Invalid portal token' });
          socket.contactId = matched._id.toString();
          socket.userId    = matched.userId.toString();
          socket.isAuthenticated = true;
        }

        // Verify journey belongs to the user this contact is watching
        const journey = await Journey.findOne({
          _id:    journeyId,
          userId: socket.userId,
        }).lean();

        if (!journey) return socket.emit('error', { message: 'Journey not found' });

        const user = await User.findById(socket.userId).select('name').lean();

        // Join portal room for this journey
        const room = `portal:${journeyId}`;
        socket.join(room);
        socket.currentJourneyId = journeyId;

        socket.emit('portal:joined', {
          journeyId,
          userName:         user?.name || 'SafeStride User',
          journeyStatus:    journey.status,
          estimatedArrival: journey.estimatedArrival,
          transportMode:    journey.transportMode,
          destination:      journey.plannedDestination,
        });

        console.log(`👁  Portal client joined room ${room}`);
      } catch (err) {
        console.error('portal:join error:', err.message);
        socket.emit('error', { message: 'Failed to join portal room' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`👁  Portal client disconnected: ${socket.id}`);
    });
  });
};