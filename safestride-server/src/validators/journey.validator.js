'use strict';

/**
 * journey.validator.js — F-10
 */

const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const source = Object.keys(req.body).length > 0 ? req.body : req.params;
  const { error, value } = schema.validate(
    req.method === 'GET' ? req.query : req.body,
    { abortEarly: true, stripUnknown: true }
  );
  if (error) {
    return res.status(400).json({
      success: false,
      error:   error.details[0].message,
      code:    'VALIDATION_ERROR',
    });
  }
  req.body = value;
  next();
};

// POST /journeys/start
const startJourneySchema = Joi.object({
  destination: Joi.object({
    lat:              Joi.number().min(-90).max(90).required(),
    lng:              Joi.number().min(-180).max(180).required(),
    formattedAddress: Joi.string().trim().max(300),
  }).required(),

  currentLocation: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).required(),

  plannedDurationMinutes: Joi.number().integer().min(1).max(480).required()
    .messages({ 'any.required': 'Journey duration is required' }),

  transportMode: Joi.string()
    .valid('walking', 'auto', 'cab', 'bus', 'mixed')
    .default('walking'),

  initiatedBy: Joi.string().valid('voice', 'manual').default('manual'),

  voiceTranscript: Joi.string().trim().max(500).optional(),
});

// POST /journeys/:id/ping
const pingSchema = Joi.object({
  lat:          Joi.number().min(-90).max(90).required(),
  lng:          Joi.number().min(-180).max(180).required(),
  accuracy:     Joi.number().min(0).max(10000).optional(),
  speed:        Joi.number().min(0).optional().allow(null),
  heading:      Joi.number().min(0).max(360).optional().allow(null),
  batteryLevel: Joi.number().min(0).max(100).optional().allow(null),
  timestamp:    Joi.number().optional(), // Unix ms
});

module.exports = {
  validateStartJourney: validate(startJourneySchema),
  validatePing:         validate(pingSchema),
};