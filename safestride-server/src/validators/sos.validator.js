'use strict';

/**
 * sos.validator.js — F-20
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

// POST /sos/trigger
const triggerSOSSchema = Joi.object({
  journeyId: Joi.string().optional().allow(null),
  triggeredBy: Joi.string()
    .valid('voice_keyword', 'button', 'auto_delay', 'auto_deviation', 'dead_mans_switch')
    .default('button'),
  location: Joi.object({
    lat:      Joi.number().min(-90).max(90).required(),
    lng:      Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().optional(),
  }).required(),
});

// POST /sos/:id/resolve
const resolveSOSSchema = Joi.object({
  resolvedBy: Joi.string().valid('user', 'contact', 'auto_timeout').default('user'),
  notes:      Joi.string().trim().max(500).optional(),
});

module.exports = {
  validateTriggerSOS: validate(triggerSOSSchema),
  validateResolveSOS: validate(resolveSOSSchema),
};