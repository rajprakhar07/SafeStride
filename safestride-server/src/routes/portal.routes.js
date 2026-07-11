'use strict';

/**
 * portal.routes.js — F-15
 * No authentication required — token-based access only.
 */

const express    = require('express');
const controller = require('../controllers/portal.controller');

const router = express.Router();

// GET /api/v1/portal/:token
router.get('/:token', controller.getPortalData);

module.exports = router;