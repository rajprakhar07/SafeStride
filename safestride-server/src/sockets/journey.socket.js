'use strict';

/**
 * journey.socket.js — updated in F-13
 * Adds deviation detection on every location:ping event.
 */

const Journey           = require('../models/Journey');
const journeyService    = require('../services/journey.service');
const etaService        = require('../services/eta.service');
const deviationService  = require('../services/deviation.service');
const { emitToPortalRoom } = require('./index');

module.exports = function registerJourneySocket(journeyNS) {
  journeyNS.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected — user: ${userId} | socket: ${socket.id}`);

    // ── journey:join ───────────────────────────────────────────────────────────
    socket.on('journey:join', async ({ journeyId } = {}) => {
      try {
        if (!journeyId) return socket.emit('error', { message: 'journeyId is required' });

        const journey = await Journey.findOne({ _id: journeyId, userId, status: 'active' }).lean();
        if (!journey) return socket.emit('error', { message: 'Active journey not found' });

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
  console.log("🔥 location:ping received", pingData);

  try {
    const journeyId = socket.currentJourneyId;
    console.log("Journey ID:", journeyId);

    if (!journeyId) {
      console.log("❌ No journey joined");
      return socket.emit('error', { message: 'Join a journey room first' });
    }

    const { lat, lng, accuracy, speed, heading, batteryLevel, timestamp } = pingData;

    if (lat === undefined || lng === undefined) {
      console.log("❌ Invalid coordinates");
      return socket.emit('error', { message: 'lat and lng are required' });
    }

  
   // 1. Fetch journey for ETA + deviation check
const journey = await Journey.findOne({
  _id: journeyId,
  userId,
  status: "active",
}).lean();

if (!journey) {
  console.log("❌ Journey not found");
  return socket.emit("error", {
    message: "Journey no longer active",
  });
}

console.log("Journey found:", true);
console.log("Polyline exists:", !!journey.plannedRoute?.polyline);
console.log("Polyline length:", journey.plannedRoute?.polyline?.length);
console.log("➡ About to call checkDeviation");
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

        // 4. ── DEVIATION DETECTION (F-13) ──────────────────────────────────────
        const { isDeviation, deviationMeters } = await deviationService.checkDeviation({
          journeyId,
          userId,
          location:        { lat, lng },
          encodedPolyline: journey.plannedRoute?.polyline || null,
        });
        console.log("✅ checkDeviation returned:", {
  isDeviation,
  deviationMeters,
});

        const updatePayload = {
          lat, lng,
          accuracy:        accuracy  || null,
          speed:           speed     || null,
          timestamp:       timestamp || Date.now(),
          eta:             etaDate,
          remainingMeters,
          remainingMinutes,
          deviationAlert:  isDeviation,
          deviationMeters: deviationMeters || null,
        };

        // 5. Broadcast to journey room + portal room
        journeyNS.to(`journey:${journeyId}`).emit('location:update', updatePayload);
        emitToPortalRoom(journeyId, 'location:update', updatePayload);

        // 6. Check if arrived (within 50m)
        if (remainingMeters <= 50) {
          await Journey.findByIdAndUpdate(journeyId, {
            status: 'completed', actualArrival: new Date(),
          });
          await journeyService.flushPingsToMongoDB(journeyId);
          await deviationService.resetDeviationState(journeyId);

          const endPayload = { journeyId, status: 'completed', message: 'You have arrived at your destination!' };
          journeyNS.to(`journey:${journeyId}`).emit('journey:ended', endPayload);
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

if (!jId) {
  return socket.emit("error", {
    message: "journeyId required",
  });
}

const journey = await Journey.findOne({
  _id: jId,
  userId,
  status: "active",
});

if (!journey) {
  return socket.emit("error", {
    message: "Active journey not found",
  });
}

journey.status = "completed";
        journey.actualArrival = new Date();
        await journey.save();
        await journeyService.flushPingsToMongoDB(jId);
        await deviationService.resetDeviationState(jId);

        const endPayload = { journeyId: jId, status: 'completed' };
        journeyNS.to(`journey:${jId}`).emit('journey:ended', endPayload);
        emitToPortalRoom(jId, 'journey:ended', endPayload);

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
    });

    socket.on('error', (err) => {
      console.error(`Socket error for user ${userId}:`, err.message);
    });
  });
};
