'use strict';

/**
 * journey.controller.js — updated in F-19
 * Schedules delay alerts and dead man's switch on journey start.
 * Cancels them on journey end.
 */

const Journey        = require('../models/Journey');
const R              = require('../utils/response.utils');
const journeyService = require('../services/journey.service');
const etaService     = require('../services/eta.service');
const notificationService = require('../services/notification.service');
const {
  scheduleDelayAlert,
  cancelDelayAlert,
  scheduleDeadManSwitch,
  cancelDeadManSwitch,
  resetDeadManSwitch,
} = require('../jobs/queue');

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
      return R.conflict(res, 'You already have an active journey. End it before starting a new one.', 'JOURNEY_ALREADY_ACTIVE');
    }

    // 2. Fetch route
    const { polyline, distanceMeters } = await journeyService.fetchRoute(currentLocation, destination, transportMode);

    // 3. Calculate ETA
    const { etaDate } = etaService.calculateETA({
      currentLocation, destination, transportMode, currentSpeed: null,
    });

    // 4. Create journey
    const journey = await Journey.create({
      userId,
      status:  'active',
      startLocation: { coordinates: currentLocation, formattedAddress: null, timestamp: new Date() },
      plannedDestination: { coordinates: destination, formattedAddress: destination.formattedAddress || null },
      plannedDurationMinutes,
      estimatedArrival:  etaDate,
      initiatedBy:       initiatedBy || 'manual',
      voiceTranscript:   voiceTranscript || null,
      transportMode:     transportMode || 'walking',
      plannedRoute:      polyline ? { polyline, distanceMeters, riskScore: null, riskLevel: null } : null,
    });

    const journeyId = journey._id.toString();

    // 5. Schedule delay alert (fires 10 min after ETA)
    await scheduleDelayAlert(journeyId, userId, etaDate, 10).catch((err) =>
      console.warn('Failed to schedule delay alert:', err.message)
    );

    // 6. Schedule dead man's switch (fires if no ping for 5 min)
    await scheduleDeadManSwitch(journeyId, userId, 5).catch((err) =>
      console.warn('Failed to schedule DMS:', err.message)
    );

    // 7. Notify contacts — journey started
    notificationService.notifyJourneyStart(
      userId, journeyId,
      destination.formattedAddress || 'their destination'
    ).catch(() => {});

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
        plannedRoute:      polyline ? { polyline } : null,
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

    const journey = await Journey.findOne({ _id: journeyId, userId, status: 'active' }).lean();
    if (!journey) return R.notFound(res, 'Active journey not found');

    const pingData = req.body;
    await journeyService.storePing(journeyId, userId, pingData);

    const { etaDate, remainingMeters, remainingMinutes } = etaService.calculateETA({
      currentLocation: { lat: pingData.lat, lng: pingData.lng },
      destination:     journey.plannedDestination.coordinates,
      transportMode:   journey.transportMode,
      currentSpeed:    pingData.speed || null,
    });

    // Reset dead man's switch on every ping
    await resetDeadManSwitch(journeyId, userId).catch(() => {});

    if (remainingMeters <= 50) {
      await Journey.findByIdAndUpdate(journeyId, { status: 'completed', actualArrival: new Date(), endLocation: { coordinates: { lat: pingData.lat, lng: pingData.lng }, formattedAddress: null, timestamp: new Date() } });
      await journeyService.flushPingsToMongoDB(journeyId);
      await cancelDelayAlert(journeyId);
      await cancelDeadManSwitch(journeyId);
      notificationService.notifyJourneyEnd(userId, journeyId).catch(() => {});
      return R.ok(res, { arrived: true, message: 'You have arrived at your destination!' });
    }

    return R.ok(res, { journeyId, eta: etaDate, remainingMeters, remainingMinutes, pingStored: true });
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
    await journey.save();
    const flushed = await journeyService.flushPingsToMongoDB(journeyId);

    // Cancel scheduled jobs
    await cancelDelayAlert(journeyId);
    await cancelDeadManSwitch(journeyId);

    // Notify contacts — arrived safely
    notificationService.notifyJourneyEnd(userId, journeyId).catch(() => {});

    return R.ok(res, { journeyId, status: 'completed', pingsFlushed: flushed, duration: Math.round((Date.now() - new Date(journey.createdAt).getTime()) / 60000) }, 'Journey ended successfully');
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
  } catch (err) { next(err); }
}

// ─── Journey History ──────────────────────────────────────────────────────────
async function getJourneyHistory(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [journeys, total] = await Promise.all([
      Journey.find({ userId: req.userId, status: { $ne: 'active' } }, { plannedRoute: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Journey.countDocuments({ userId: req.userId, status: { $ne: 'active' } }),
    ]);

    return R.ok(res, { journeys, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

// ─── Single Journey ───────────────────────────────────────────────────────────
async function getJourney(req, res, next) {
  try {
    const journey = await Journey.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!journey) return R.notFound(res, 'Journey not found');
    return R.ok(res, { journey });
  } catch (err) { next(err); }
}

module.exports = { startJourney, pingLocation, endJourney, getActiveJourney, getJourneyHistory, getJourney };