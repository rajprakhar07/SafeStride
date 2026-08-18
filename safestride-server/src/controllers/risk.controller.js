'use strict';

/**
 * risk.controller.js — F-23
 *
 * POST /api/v1/risk/score-route       — score a route
 * GET  /api/v1/risk/danger-spots      — get nearby danger spots
 * POST /api/v1/risk/danger-spots      — report a danger spot
 * POST /api/v1/risk/danger-spots/:id/confirm — confirm a spot
 */

const riskService = require('../services/risk.service');
const journeyService = require('../services/journey.service');
const DangerSpot  = require('../models/DangerSpot');
const R           = require('../utils/response.utils');

// ─── Score Route ──────────────────────────────────────────────────────────────
async function scoreRoute(req, res, next) {
  try {
    const {
      origin,
      destination,
      transportMode = 'walking',
      routeLengthMeters,
    } = req.body;

    if (
      !origin ||
      typeof origin.lat !== 'number' ||
      typeof origin.lng !== 'number' ||
      !destination ||
      typeof destination.lat !== 'number' ||
      typeof destination.lng !== 'number'
    ) {
      return R.badRequest(
        res,
        'origin and destination coordinates are required'
      );
    }

    // 1. Get the actual road route from ORS
    const route = await journeyService.fetchRoute(
      origin,
      destination,
      transportMode
    );

    console.log('🛣️ ROUTE RESULT:', {
      distanceMeters: route.distanceMeters,
      hasPolyline: !!route.polyline,
    });

    // 2. Use explicitly supplied distance if available,
    //    otherwise use the actual ORS distance.
    const actualRouteLength =
      typeof routeLengthMeters === 'number'
        ? routeLengthMeters
        : route.distanceMeters;

    // 3. Send the actual route distance into the AI risk scorer
    const result = await riskService.scoreRoute({
      origin,
      destination,
      transportMode,
      routeLengthMeters: actualRouteLength,
    });

    // 4. Return both route + detailed risk analysis
    return R.ok(
      res,
      {
        ...result,
        route: {
          distanceMeters: route.distanceMeters,
          polyline: route.polyline,
          source: route.polyline ? 'openrouteservice' : 'straight-line-fallback',
        },
      },
      'Route scored successfully'
    );
  } catch (err) {
    next(err);
  }
}

// ─── Get Danger Spots ─────────────────────────────────────────────────────────
async function getDangerSpots(req, res, next) {
  try {
    const lat    = parseFloat(req.query.lat);
    const lng    = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius) || 500;

    if (isNaN(lat) || isNaN(lng)) {
      return R.badRequest(res, 'lat and lng query parameters are required');
    }

    const spots = await DangerSpot.find({
      isActive: true,
      location: {
        $near: {
          $geometry:    { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Math.min(radius, 5000), // max 5km
        },
      },
    })
    .select('-confirmedBy') // don't expose user IDs
    .limit(50)
    .lean();

    return R.ok(res, { spots, total: spots.length });
  } catch (err) {
    next(err);
  }
}

// ─── Report Danger Spot ───────────────────────────────────────────────────────
async function reportDangerSpot(req, res, next) {
  try {
    const userId = req.userId;
    const {
      lat,
      lng,
      category,
      description,
      severity    = 'medium',
      isAnonymous = false,
      radius      = 100,
    } = req.body;

    if (!lat || !lng || !category) {
      return R.badRequest(res, 'lat, lng and category are required');
    }

    const VALID_CATEGORIES = ['harassment', 'poor_lighting', 'isolated_area', 'accident_prone', 'other'];
    if (!VALID_CATEGORIES.includes(category)) {
      return R.badRequest(res, `category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    const spot = await DangerSpot.create({
      reportedBy:  isAnonymous ? null : userId,
      isAnonymous,
      location: {
        type:        'Point',
        coordinates: [lng, lat], // GeoJSON: [lng, lat]
      },
      radius,
      category,
      description: description || null,
      severity,
      confirmCount: 0,
      isActive:     true,
    });

    return R.created(res, {
      spot: {
        _id:         spot._id,
        category:    spot.category,
        severity:    spot.severity,
        location:    { lat, lng },
        isAnonymous: spot.isAnonymous,
        activeUntil: spot.activeUntil,
      },
    }, 'Danger spot reported — thank you for keeping the community safe!');
  } catch (err) {
    next(err);
  }
}

// ─── Confirm Danger Spot ──────────────────────────────────────────────────────
async function confirmDangerSpot(req, res, next) {
  try {
    const { id }  = req.params;
    const userId  = req.userId;

    const spot = await DangerSpot.findOne({ _id: id, isActive: true });
    if (!spot) return R.notFound(res, 'Danger spot not found');

    await spot.addConfirmation(userId);

    return R.ok(res, {
      confirmCount: spot.confirmCount,
      activeUntil:  spot.activeUntil,
    }, 'Danger spot confirmed');
  } catch (err) {
    next(err);
  }
}

module.exports = { scoreRoute, getDangerSpots, reportDangerSpot, confirmDangerSpot };