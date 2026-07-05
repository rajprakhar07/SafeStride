'use strict';

/**
 * routes/index.js — updated in F-05
 * Central route aggregator.
 */

const express = require('express');
const router  = express.Router();

// ── Auth (F-03) ───────────────────────────────────────────────────────────────
router.use('/auth', require('./auth.routes'));

// ── Users (F-05) ─────────────────────────────────────────────────────────────
router.use('/users', require('./user.routes'));

// ── Future routes ─────────────────────────────────────────────────────────────
// router.use('/contacts', require('./contact.routes'));   // F-07
// router.use('/journeys', require('./journey.routes'));   // F-10
// router.use('/sos',      require('./sos.routes'));       // F-20
// router.use('/risk',     require('./risk.routes'));      // F-23
// router.use('/portal',   require('./portal.routes'));    // F-15
// router.use('/admin',    require('./admin.routes'));     // F-30

module.exports = router;