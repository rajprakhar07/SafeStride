'use strict';

/**
 * auth.validator.js — F-03
 * Joi schemas for all auth endpoint request bodies.
 */

const Joi = require('joi');

// ─── Reusable field definitions ───────────────────────────────────────────────

const phoneSchema = Joi.string()
  .pattern(/^\+[1-9]\d{6,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone must be in E.164 format e.g. +919876543210',
    'any.required':        'Phone number is required',
  });

const otpSchema = Joi.string()
  .length(6)
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.length':       'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only digits',
    'any.required':        'OTP is required',
  });

// ─── Endpoint schemas ─────────────────────────────────────────────────────────

/** POST /auth/send-otp */
const sendOTPSchema = Joi.object({
  phone: phoneSchema,
});

/** POST /auth/verify-otp */
const verifyOTPSchema = Joi.object({
  phone: phoneSchema,
  otp:   otpSchema,
});

/** POST /auth/refresh — refresh token comes from httpOnly cookie, no body needed */
const refreshSchema = Joi.object({}).options({ allowUnknown: false });

/** POST /auth/logout — optional: logout everywhere flag */
const logoutSchema = Joi.object({
  everywhere: Joi.boolean().default(false),
});

// ─── Validation middleware factory ────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against the given schema.
 * On failure: responds 400 with the first validation error.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly:    true,
    stripUnknown:  true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error:   error.details[0].message,
      code:    'VALIDATION_ERROR',
    });
  }

  req.body = value; // replace with sanitized value
  next();
};

module.exports = {
  validateSendOTP:   validate(sendOTPSchema),
  validateVerifyOTP: validate(verifyOTPSchema),
  validateRefresh:   validate(refreshSchema),
  validateLogout:    validate(logoutSchema),
};