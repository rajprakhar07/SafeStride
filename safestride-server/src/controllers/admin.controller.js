'use strict';

/**
 * admin.controller.js — F-30
 *
 * GET /api/v1/admin/stats      — overview stats
 * GET /api/v1/admin/heatmap    — danger spot GeoJSON
 * GET /api/v1/admin/journeys   — paginated journeys (anonymized)
 * GET /api/v1/admin/sos-events — SOS events log
 */

const User        = require('../models/User');
const Journey     = require('../models/Journey');
const SOSEvent    = require('../models/SOSEvent');
const DangerSpot  = require('../models/DangerSpot');
const Alert       = require('../models/Alert');
const R           = require('../utils/response.utils');

async function getStats(req, res, next) {
  try {
    const [totalUsers, totalJourneys, totalSOS, activeDangerSpots, journeysToday, sosToday] =
      await Promise.all([
        User.countDocuments({ isActive: true, deletedAt: null }),
        Journey.countDocuments(),
        SOSEvent.countDocuments(),
        DangerSpot.countDocuments({ isActive: true }),
        Journey.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
        SOSEvent.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      ]);

    // Journey volume last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyJourneys = await Journey.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return R.ok(res, {
      totalUsers,
      totalJourneys,
      totalSOS,
      activeDangerSpots,
      journeysToday,
      sosToday,
      dailyJourneys,
    });
  } catch (err) { next(err); }
}

async function getHeatmap(req, res, next) {
  try {
    const spots = await DangerSpot.find({ isActive: true })
      .select('location category severity confirmCount')
      .lean();

    const geojson = {
      type: 'FeatureCollection',
      features: spots.map((s) => ({
        type: 'Feature',
        geometry: s.location,
        properties: {
          category:     s.category,
          severity:     s.severity,
          confirmCount: s.confirmCount,
        },
      })),
    };

    return R.ok(res, { geojson, total: spots.length });
  } catch (err) { next(err); }
}

async function getJourneys(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [journeys, total] = await Promise.all([
      Journey.find({}, { plannedRoute: 0, trustedContactsNotified: 0 })
        .sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('userId', 'name phone')
        .lean(),
      Journey.countDocuments(),
    ]);

    // Anonymize — only show first name + last 4 digits of phone
    const anonymized = journeys.map((j) => ({
      ...j,
      userId: j.userId ? {
        userId: (j.userId || {}).name || 'User',
        phone: '****' + ((j.userId || {}).phone || '').slice(-4),
      } : null,
    }));

    return R.ok(res, { journeys: anonymized, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function getSOSEvents(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [events, total] = await Promise.all([
      SOSEvent.find({})
        .sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('userId', 'name')
        .lean(),
      SOSEvent.countDocuments(),
    ]);

    // Anonymize
    const anonymized = events.map((e) => ({
      ...e,
      userId:   undefined,
      userName: (e.userId || {}).name || 'User',
      location: {
        lat: parseFloat(e.location.lat.toFixed(2)), // reduce precision
        lng: parseFloat(e.location.lng.toFixed(2)),
      },
    }));

    return R.ok(res, { events: anonymized, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

module.exports = { getStats, getHeatmap, getJourneys, getSOSEvents };