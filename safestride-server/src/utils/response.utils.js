'use strict';

/**
 * response.utils.js — F-03
 * Standard API response format for ALL endpoints.
 * Every controller uses these — never call res.json() directly.
 */

const ok           = (res, data = {}, message = 'Success') =>
  res.status(200).json({ success: true, message, data });

const created      = (res, data = {}, message = 'Created successfully') =>
  res.status(201).json({ success: true, message, data });

const badRequest   = (res, message = 'Bad request', code = 'BAD_REQUEST') =>
  res.status(400).json({ success: false, error: message, code });

const unauthorized = (res, message = 'Unauthorized', code = 'UNAUTHORIZED') =>
  res.status(401).json({ success: false, error: message, code });

const forbidden    = (res, message = 'Forbidden', code = 'FORBIDDEN') =>
  res.status(403).json({ success: false, error: message, code });

const notFound     = (res, message = 'Resource not found', code = 'NOT_FOUND') =>
  res.status(404).json({ success: false, error: message, code });

const conflict     = (res, message = 'Conflict', code = 'CONFLICT') =>
  res.status(409).json({ success: false, error: message, code });

const tooManyRequests = (res, message = 'Too many requests', code = 'RATE_LIMITED') =>
  res.status(429).json({ success: false, error: message, code });

const serverError  = (res, message = 'Internal server error', code = 'SERVER_ERROR') =>
  res.status(500).json({ success: false, error: message, code });

module.exports = { ok, created, badRequest, unauthorized, forbidden, notFound, conflict, tooManyRequests, serverError };