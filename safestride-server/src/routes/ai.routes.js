'use strict';

/**
 * ai.routes.js — AI Safety Assistant
 *
 * POST /api/v1/ai/analyze — safety score, summary, recommendations
 * POST /api/v1/ai/chat    — conversational assistant
 *
 * All routes require authentication, matching journey.routes.js.
 */

const express    = require('express');
const controller = require('../controllers/ai.controller');
const validator  = require('../validators/ai.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/analyze', validator.validateAnalyze, controller.analyze);
router.post('/chat',    validator.validateChat,    controller.chat);

module.exports = router;