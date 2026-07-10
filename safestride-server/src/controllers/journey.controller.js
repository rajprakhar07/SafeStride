'use strict';

/**
 * journey.controller.js — F-10
 *
 * POST /journeys/start       — start a new journey
 * POST /journeys/:id/ping    — send location ping
 * POST /journeys/:id/end     — end journey
 * GET  /journeys/active      — get active journey
 * GET  /journeys/history     — journey history (paginated)
 * GET  /journeys/:id         — single journey detail
 */

const Journey        = require('../models/Journey');
const LocationPing   = require('../models/LocationPing');
const R              = require('../utils/response.utils');
const journeyService = require('../services/journey.service');
const etaService     = require('../services/eta.service');
const { decodePolyline } = require('../utils/geo.utils');

// ─── Start Journey ────────────────────────────────────────────────────────────
async function startJourney(req, res, next) {
  try {
    const userId = req.userId;
    const {
      destination,
      currentLocation,
      plannedDurationMinutes,
      transportMode,
      initiatedBy,
      voiceTranscript,
    } = req.body;

    // 1. Enforce only 1 active journey at a time
    const existing = await Journey.findOne({ userId, status: 'active' });
    if (existing) {
      return R.conflict(
        res,
        'You already have an active journey. End it before starting a new one.',
        'JOURNEY_ALREADY_ACTIVE'
      );
    }

    // 2. Fetch route from Google Directions API (or straight-line fallback)
    const { polyline, distanceMeters } = await journeyService.fetchRoute(
      currentLocation,
      destination,
      transportMode
    );

    // 3. Calculate initial ETA
    const { etaDate } = etaService.calculateETA({
      currentLocation,
      destination,
      transportMode,
      currentSpeed: null,
    });

    // Use user-provided duration as backup if ETA calc seems off
    const estimatedArrival = etaDate;

    // 4. Create journey document
    const journey = await Journey.create({
      userId,
      status:  'active',
      startLocation: {
        coordinates:      currentLocation,
        formattedAddress: null,
        timestamp:        new Date(),
      },
      plannedDestination: {
        coordinates:      destination,
        formattedAddress: destination.formattedAddress || null,
      },
      plannedDurationMinutes,
      estimatedArrival,
      initiatedBy:    initiatedBy || 'manual',
      voiceTranscript: voiceTranscript || null,
      transportMode:  transportMode || 'walking',
      plannedRoute: polyline
        ? { polyline, distanceMeters, riskScore: null, riskLevel: null }
        : null,
    });

    return R.created(res, {
      journey: {
        _id:               journey._id,
        status:            journey.status,
        estimatedArrival:  journey.estimatedArrival,
        plannedDurationMinutes: journey.plannedDurationMinutes,
        transportMode:     journey.transportMode,
        startLocation:     journey.startLocation,
        plannedDestination: journey.plannedDestination,
        hasRoute:          !!polyline,
      },
    }, 'Journey started successfully');
  } catch (err) {
    next(err);
  }
}

// ─── Location Ping ────────────────────────────────────────────────────────────
async function pingLocation(req, res, next) {
  try {
    const { id: journeyId } = req.params;
    const userId = req.userId;

    // Verify journey belongs to user and is active
    const journey = await Journey.findOne({ _id: journeyId, userId, status: 'active' }).lean();
    if (!journey) return R.notFound(res, 'Active journey not found');

    const pingData = req.body;

    // Store ping in Redis (batch flush to MongoDB every 60s)
    await journeyService.storePing(journeyId, userId, pingData);

    // Recalculate ETA
    const { etaDate, remainingMeters, remainingMinutes } = etaService.calculateETA({
      currentLocation: { lat: pingData.lat, lng: pingData.lng },
      destination:     journey.plannedDestination.coordinates,
      transportMode:   journey.transportMode,
      currentSpeed:    pingData.speed || null,
    });

    // Check if destination reached (within 50 meters)
    if (remainingMeters <= 50) {
      await Journey.findByIdAndUpdate(journeyId, {
        status:       'completed',
        actualArrival: new Date(),
        endLocation:  {
          coordinates:      { lat: pingData.lat, lng: pingData.lng },
          formattedAddress: null,
          timestamp:        new Date(),
        },
      });
      await journeyService.flushPingsToMongoDB(journeyId);
      return R.ok(res, { arrived: true, message: 'You have arrived at your destination!' });
    }

    return R.ok(res, {
      journeyId,
      eta:             etaDate,
      remainingMeters,
      remainingMinutes,
      pingStored:      true,
    });
  } catch (err) {
    next(err);
  }
}

// ─── End Journey ──────────────────────────────────────────────────────────────
async function endJourney(req, res, next) {
  try {
    const { id: journeyId } = req.params;
    const userId = req.userId;

    const journey = await Journey.findOne({ _id: journeyId, userId, status: 'active' });
    if (!journey) return R.notFound(res, 'Active journey not found');

    journey.status        = 'completed';
    journey.actualArrival = new Date();
    journey.endLocation   = {
      coordinates:      null,
      formattedAddress: null,
      timestamp:        new Date(),
    };
    await journey.save();

    // Flush remaining pings from Redis to MongoDB
    const flushed = await journeyService.flushPingsToMongoDB(journeyId);

    return R.ok(res, {
      journeyId,
      status:        'completed',
      pingsFlushed:  flushed,
      duration:      Math.round((Date.now() - new Date(journey.createdAt).getTime()) / 60000),
    }, 'Journey ended successfully');
  } catch (err) {
    next(err);
  }
}

// ─── Get Active Journey ────────────────────────────────────────────────────────
async function getActiveJourney(req, res, next) {
  try {
    const journey = await Journey.findOne({ userId: req.userId, status: 'active' }).lean();
    if (!journey) return R.notFound(res, 'No active journey found');
    return R.ok(res, { journey });
  } catch (err) {
    next(err);
  }
}

// ─── Journey History ──────────────────────────────────────────────────────────
async function getJourneyHistory(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [journeys, total] = await Promise.all([
      Journey.find(
        { userId: req.userId, status: { $ne: 'active' } },
        { plannedRoute: 0 } // exclude heavy polyline data from list
      ).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Journey.countDocuments({ userId: req.userId, status: { $ne: 'active' } }),
    ]);

    return R.ok(res, {
      journeys,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Single Journey ───────────────────────────────────────────────────────────
async function getJourney(req, res, next) {
  try {
    const journey = await Journey.findOne({
      _id:    req.params.id,
      userId: req.userId,
    }).lean();
    if (!journey) return R.notFound(res, 'Journey not found');
    return R.ok(res, { journey });
  } catch (err) {
    next(err);
  }
}

module.exports = { startJourney, pingLocation, endJourney, getActiveJourney, getJourneyHistory, getJourney };