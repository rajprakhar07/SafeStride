'use strict';

/**
 * journey.socket.js — F-11
 *
 * Socket.io event handlers for the /journey namespace.
 *
 * Client → Server events:
 *   journey:join        { journeyId }  — join a journey room
 *   location:ping       { lat, lng, accuracy, speed, heading, batteryLevel, timestamp }
 *   journey:end         { journeyId }
 *
 * Server → Client events:
 *   journey:joined      { journeyId, room }
 *   location:update     { lat, lng, accuracy, speed, timestamp, eta, remainingMeters }
 *   journey:ended       { journeyId, status }
 *   error               { message }
 */

const Journey        = require('../models/Journey');
const journeyService = require('../services/journey.service');
const etaService     = require('../services/eta.service');
const { emitToPortalRoom } = require('./index');

/**
 * Register journey socket event handlers on the /journey namespace.
 * @param {import('socket.io').Namespace} journeyNS
 */
module.exports = function registerJourneySocket(journeyNS) {
  journeyNS.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected — user: ${userId} | socket: ${socket.id}`);

    // ── journey:join ───────────────────────────────────────────────────────────
    socket.on('journey:join', async ({ journeyId } = {}) => {
      try {
        if (!journeyId) {
          return socket.emit('error', { message: 'journeyId is required' });
        }

        // Verify journey belongs to this user
        const journey = await Journey.findOne({
          _id:    journeyId,
          userId: userId,
          status: 'active',
        }).lean();

        if (!journey) {
          return socket.emit('error', { message: 'Active journey not found' });
        }

        const room = `journey:${journeyId}`;
        socket.join(room);
        socket.currentJourneyId = journeyId;

        socket.emit('journey:joined', {
          journeyId,
          room,
          estimatedArrival: journey.estimatedArrival,
          transportMode:    journey.transportMode,
        });

        console.log(`📍 User ${userId} joined room ${room}`);
      } catch (err) {
        console.error('journey:join error:', err.message);
        socket.emit('error', { message: 'Failed to join journey room' });
      }
    });

    // ── location:ping ─────────────────────────────────────────────────────────
    socket.on('location:ping', async (pingData = {}) => {
      try {
        const journeyId = socket.currentJourneyId;
        if (!journeyId) {
          return socket.emit('error', { message: 'Join a journey room first' });
        }

        const { lat, lng, accuracy, speed, heading, batteryLevel, timestamp } = pingData;

        if (lat === undefined || lng === undefined) {
          return socket.emit('error', { message: 'lat and lng are required' });
        }

        // 1. Get journey for ETA recalculation
        const journey = await Journey.findOne({
          _id:    journeyId,
          userId: userId,
          status: 'active',
        }).lean();

        if (!journey) {
          return socket.emit('error', { message: 'Journey no longer active' });
        }

        // 2. Store ping in Redis
        await journeyService.storePing(journeyId, userId, {
          lat, lng, accuracy, speed, heading, batteryLevel, timestamp,
        });

        // 3. Recalculate ETA
        const { etaDate, remainingMeters, remainingMinutes } = etaService.calculateETA({
          currentLocation: { lat, lng },
          destination:     journey.plannedDestination.coordinates,
          transportMode:   journey.transportMode,
          currentSpeed:    speed || null,
        });

        const updatePayload = {
          lat,
          lng,
          accuracy:        accuracy || null,
          speed:           speed    || null,
          timestamp:       timestamp || Date.now(),
          eta:             etaDate,
          remainingMeters,
          remainingMinutes,
        };

        // 4. Broadcast to all sockets in the journey room (including this one)
        journeyNS.to(`journey:${journeyId}`).emit('location:update', updatePayload);

        // 5. Also broadcast to portal room (trusted contacts watching)
        emitToPortalRoom(journeyId, 'location:update', updatePayload);

        // 6. Check if arrived (within 50m)
        if (remainingMeters <= 50) {
          await Journey.findByIdAndUpdate(journeyId, {
            status:        'completed',
            actualArrival: new Date(),
          });
          await journeyService.flushPingsToMongoDB(journeyId);

          journeyNS.to(`journey:${journeyId}`).emit('journey:ended', {
            journeyId,
            status:  'completed',
            message: 'You have arrived at your destination!',
          });
          emitToPortalRoom(journeyId, 'journey:ended', { journeyId, status: 'completed' });
        }
      } catch (err) {
        console.error('location:ping error:', err.message);
        socket.emit('error', { message: 'Failed to process location ping' });
      }
    });

    // ── journey:end ───────────────────────────────────────────────────────────
    socket.on('journey:end', async ({ journeyId } = {}) => {
      try {
        const jId = journeyId || socket.currentJourneyId;
        if (!jId) return socket.emit('error', { message: 'journeyId required' });

        const journey = await Journey.findOne({ _id: jId, userId, status: 'active' });
        if (!journey) return socket.emit('error', { message: 'Active journey not found' });

        journey.status        = 'completed';
        journey.actualArrival = new Date();
        await journey.save();
        await journeyService.flushPingsToMongoDB(jId);

        journeyNS.to(`journey:${jId}`).emit('journey:ended', {
          journeyId: jId,
          status:    'completed',
        });
        emitToPortalRoom(jId, 'journey:ended', { journeyId: jId, status: 'completed' });

        socket.leave(`journey:${jId}`);
        socket.currentJourneyId = null;
        console.log(`🏁 Journey ${jId} ended by user ${userId}`);
      } catch (err) {
        console.error('journey:end error:', err.message);
        socket.emit('error', { message: 'Failed to end journey' });
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected — user: ${userId} | reason: ${reason}`);
      // Journey continues running — dead man's switch handles prolonged disconnection
    });

    // ── error ─────────────────────────────────────────────────────────────────
    socket.on('error', (err) => {
      console.error(`Socket error for user ${userId}:`, err.message);
    });
  });
};