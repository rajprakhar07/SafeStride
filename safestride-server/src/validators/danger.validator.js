'use strict';

/**
 * danger.validator.js — F-24
 * Validation for danger spot report and confirm endpoints.
 * These are part of risk.routes.js which is already wired.
 */

const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: true, stripUnknown: true });
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message, code: 'VALIDATION_ERROR' });
  }
  req.body = value;
  next();
};

const reportDangerSpotSchema = Joi.object({
  lat:         Joi.number().min(-90).max(90).required()
    .messages({ 'any.required': 'Latitude is required' }),
  lng:         Joi.number().min(-180).max(180).required()
    .messages({ 'any.required': 'Longitude is required' }),
  category:    Joi.string()
    .valid('harassment', 'poor_lighting', 'isolated_area', 'accident_prone', 'other')
    .required()
    .messages({ 'any.required': 'Category is required', 'any.only': 'Invalid category' }),
  description: Joi.string().trim().max(500).optional().allow('', null),
  severity:    Joi.string().valid('low', 'medium', 'high').default('medium'),
  isAnonymous: Joi.boolean().default(false),
  radius:      Joi.number().min(10).max(1000).default(100),
});

const scoreRouteSchema = Joi.object({
  origin: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).required(),
  destination: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).required(),
  transportMode:     Joi.string().valid('walking', 'auto', 'cab', 'bus', 'mixed').default('walking'),
  routeLengthMeters: Joi.number().min(0).optional(),
});

module.exports = {
  validateReportDangerSpot: validate(reportDangerSpotSchema),
  validateScoreRoute:        validate(scoreRouteSchema),
};