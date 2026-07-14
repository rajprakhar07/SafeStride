'use strict';

/**
 * risk.routes.js — F-23
 */

const express    = require('express');
const controller = require('../controllers/risk.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/score-route',              controller.scoreRoute);
router.get('/danger-spots',              controller.getDangerSpots);
router.post('/danger-spots',             controller.reportDangerSpot);
router.post('/danger-spots/:id/confirm', controller.confirmDangerSpot);

module.exports = router;