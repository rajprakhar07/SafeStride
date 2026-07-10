'use strict';

/**
 * journey.routes.js — F-10
 *
 * All routes require authentication.
 *
 * POST /api/v1/journeys/start      — start journey
 * GET  /api/v1/journeys/active     — get active journey
 * GET  /api/v1/journeys/history    — journey history
 * GET  /api/v1/journeys/:id        — single journey
 * POST /api/v1/journeys/:id/ping   — location ping
 * POST /api/v1/journeys/:id/end    — end journey
 */

const express    = require('express');
const controller = require('../controllers/journey.controller');
const validator  = require('../validators/journey.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Static routes FIRST (before /:id to avoid conflicts)
router.post('/start',    validator.validateStartJourney, controller.startJourney);
router.get('/active',    controller.getActiveJourney);
router.get('/history',   controller.getJourneyHistory);

// Dynamic routes
router.get('/:id',          controller.getJourney);
router.post('/:id/ping',    validator.validatePing,  controller.pingLocation);
router.post('/:id/end',     controller.endJourney);

module.exports = router;