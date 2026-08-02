'use strict';

/**
 * ai.controller.js — AI Safety Assistant
 * New controller. Does not touch any existing controller.
 */

const R         = require('../utils/response.utils');
const aiService = require('../services/ai/ai.service');

async function analyze(req, res, next) {
  try {
    const result = await aiService.analyzeJourney({ ...req.body, userId: req.userId });
    return R.ok(res, result, result.unavailable ? 'AI analysis unavailable' : 'Safety analysis generated');
  } catch (err) {
    next(err);
  }
}

async function chat(req, res, next) {
  try {
    const result = await aiService.chat({ ...req.body, userId: req.userId });
    return R.ok(res, result, result.unavailable ? 'AI chat unavailable' : 'Reply generated');
  } catch (err) {
    next(err);
  }
}

module.exports = { analyze, chat };