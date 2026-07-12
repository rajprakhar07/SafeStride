'use strict';

/**
 * sos.routes.js — F-20
 */

const express    = require('express');
const multer     = require('multer');
const controller = require('../controllers/sos.controller');
const validator  = require('../validators/sos.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(authenticate);

router.post('/trigger',          validator.validateTriggerSOS, controller.triggerSOS);
router.get('/active',            controller.getActiveSOS);
router.post('/:id/resolve',      validator.validateResolveSOS, controller.resolveSOS);
router.post('/audio-upload',     upload.single('audio'),       controller.uploadAudio);

module.exports = router;