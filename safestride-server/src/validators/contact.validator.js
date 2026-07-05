'use strict';

/**
 * contact.validator.js — F-07
 * Joi validation schemas for trusted contact endpoints.
 */

const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly:   true,
    stripUnknown: true,
  });
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

// ─── POST /contacts ───────────────────────────────────────────────────────────
const addContactSchema = Joi.object({
  contactName:  Joi.string().trim().min(1).max(100).required()
    .messages({ 'any.required': 'Contact name is required' }),

  contactPhone: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be in E.164 format e.g. +919876543210',
      'any.required':        'Contact phone number is required',
    }),

  contactEmail: Joi.string().email().trim().lowercase().optional(),

  relationship: Joi.string().trim().max(50).optional()
    .messages({ 'string.max': 'Relationship must be 50 characters or less' }),

  alertPreferences: Joi.object({
    onJourneyStart: Joi.boolean(),
    onJourneyEnd:   Joi.boolean(),
    onDeviation:    Joi.boolean(),
    onDelay:        Joi.boolean(),
    onSOS:          Joi.boolean(),
  }).optional(),
});

module.exports = {
  validateAddContact: validate(addContactSchema),
};