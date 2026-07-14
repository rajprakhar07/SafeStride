'use strict';

/**
 * risk.routes.js — updated in F-24
 * Adds Joi validation to danger spot report endpoint.
 */

const express    = require('express');
const controller = require('../controllers/risk.controller');
const { validateReportDangerSpot, validateScoreRoute } = require('../validators/danger.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.post('/score-route',              validateScoreRoute,        controller.scoreRoute);
router.get('/danger-spots',              controller.getDangerSpots);
router.post('/danger-spots',             validateReportDangerSpot,  controller.reportDangerSpot);
router.post('/danger-spots/:id/confirm', controller.confirmDangerSpot);

module.exports = router;