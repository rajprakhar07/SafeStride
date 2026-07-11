'use strict';

const express = require('express');
const router  = express.Router();

router.use('/auth',     require('./auth.routes'));
router.use('/users',    require('./user.routes'));
router.use('/contacts', require('./contact.routes'));
router.use('/journeys', require('./journey.routes'));
router.use('/portal',   require('./portal.routes'));

module.exports = router;