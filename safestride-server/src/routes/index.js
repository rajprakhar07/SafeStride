'use strict';

const express = require('express');
const router  = express.Router();

router.use('/auth',     require('./auth.routes'));
router.use('/users',    require('./user.routes'));
router.use('/contacts', require('./contact.routes'));
router.use('/journeys', require('./journey.routes'));
router.use('/portal',   require('./portal.routes'));
router.use('/sos',      require('./sos.routes'));      // F-20

// router.use('/risk',   require('./risk.routes'));    // F-23
// router.use('/admin',  require('./admin.routes'));   // F-30

module.exports = router;