'use strict';

/**
 * admin.routes.js — F-30
 * All routes require admin JWT (separate from user JWT).
 */

const express    = require('express');
const controller = require('../controllers/admin.controller');
const { verifyAccessToken } = require('../utils/token.utils');
const User       = require('../models/User');
const R          = require('../utils/response.utils');

const router = express.Router();

// Admin auth middleware — checks for admin role in JWT
async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return R.unauthorized(res);

    const token   = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Check admin flag in DB
    const user = await User.findOne({ _id: payload.userId, isActive: true }).lean();
    if (!user || !(user || {}).isAdmin) {
      return R.forbidden(res, 'Admin access required');
    }
    req.user   = user;
    req.userId = user._id.toString();
    next();
  } catch {
    return R.unauthorized(res);
  }
}

router.use(adminAuth);

router.get('/stats',      controller.getStats);
router.get('/heatmap',    controller.getHeatmap);
router.get('/journeys',   controller.getJourneys);
router.get('/sos-events', controller.getSOSEvents);

module.exports = router;