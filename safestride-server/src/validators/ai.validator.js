'use strict';

/**
 * ai.validator.js
 * Joi validation for the AI Safety Assistant endpoints, following the same
 * pattern as journey.validator.js.
 */

const Joi = require('joi');
const R   = require('../utils/response.utils');

const coordsSchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  formattedAddress: Joi.string().allow('').optional(),
});

const analyzeSchema = Joi.object({
  journeyId:              Joi.string().hex().length(24).optional(),
  origin:                 Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() }).optional(),
  destination:             coordsSchema.optional(),
  transportMode:           Joi.string().valid('walking', 'auto', 'cab', 'bus', 'mixed').optional(),
  plannedDurationMinutes:  Joi.number().integer().min(1).optional(),
})
  .or('journeyId', 'destination')
  .options({ stripUnknown: true });

const chatSchema = Joi.object({
  message:   Joi.string().min(1).max(500).required(),
  journeyId: Joi.string().hex().length(24).optional(),
  context:   Joi.object().optional(),
}).options({ stripUnknown: true });

function validateAnalyze(req, res, next) {
  const { error, value } = analyzeSchema.validate(req.body);
  if (error) return R.badRequest(res, error.details[0].message, 'VALIDATION_ERROR');
  req.body = value;
  next();
}

function validateChat(req, res, next) {
  const { error, value } = chatSchema.validate(req.body);
  if (error) return R.badRequest(res, error.details[0].message, 'VALIDATION_ERROR');
  req.body = value;
  next();
}

module.exports = { validateAnalyze, validateChat };