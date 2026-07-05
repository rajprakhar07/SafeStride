'use strict';

/**
 * user.validator.js — F-05
 * Joi validation schemas for user profile endpoints.
 */

const Joi = require('joi');

// ─── Reusable sub-schemas ─────────────────────────────────────────────────────

const coordinatesSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

const addressSchema = Joi.object({
  label:            Joi.string().trim().max(50),
  coordinates:      coordinatesSchema,
  formattedAddress: Joi.string().trim().max(300),
});

const notificationChannelsSchema = Joi.object({
  push:     Joi.boolean(),
  sms:      Joi.boolean(),
  whatsapp: Joi.boolean(),
});

const preferencesSchema = Joi.object({
  voiceSOSKeyword:          Joi.string().trim().min(2).max(30),
  defaultJourneyAlertDelay: Joi.number().integer().min(1).max(60),
  fakeCallContactName:      Joi.string().trim().max(50),
  notificationChannels:     notificationChannelsSchema,
  autoStartJourneyVoice:    Joi.boolean(),
});

// ─── PATCH /users/me ──────────────────────────────────────────────────────────
const updateProfileSchema = Joi.object({
  name:         Joi.string().trim().min(1).max(100),
  email:        Joi.string().email().trim().lowercase(),
  homeAddress:  addressSchema,
  workAddress:  addressSchema,
  savedPlaces:  Joi.array().items(addressSchema).max(10),
  preferences:  preferencesSchema,
  onboardingComplete: Joi.boolean(),
  sosAudioStorageConsent: Joi.boolean(),
  fcmToken:     Joi.string().trim().max(500),
}).min(1).messages({
  'object.min': 'At least one field must be provided to update',
});

// ─── Middleware factory ───────────────────────────────────────────────────────
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

module.exports = {
  validateUpdateProfile: validate(updateProfileSchema),
};