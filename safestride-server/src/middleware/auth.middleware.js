'use strict';

/**
 * auth.middleware.js — F-03
 *
 * JWT authentication middleware.
 * Reads Bearer token from Authorization header, verifies it,
 * and attaches the decoded user to req.user.
 *
 * Usage:
 *   router.get('/protected', authenticate, controller)
 */

const { verifyAccessToken } = require('../utils/token.utils');
const User                  = require('../models/User');
const { unauthorized }      = require('../utils/response.utils');

/**
 * Authenticate request via JWT access token.
 * Sets req.user to the full User document if valid.
 */
async function authenticate(req, res, next) {
  try {
    // 1. Extract token from Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return unauthorized(res, 'Malformed authorization header');
    }

    // 2. Verify JWT signature and expiry
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Token expired', 'TOKEN_EXPIRED');
      }
      return unauthorized(res, 'Invalid token', 'TOKEN_INVALID');
    }

    // 3. Load user from DB — ensures user still exists and is active
    const user = await User.findOne({
      _id:      payload.userId,
      isActive: true,
      deletedAt: null,
    }).lean();

    if (!user) {
      return unauthorized(res, 'User not found or account deactivated');
    }

    // 4. Attach to request
    req.user   = user;
    req.userId = user._id.toString();

    // 5. Update lastActiveAt in background (don't await — don't block request)
    User.updateOne({ _id: user._id }, { lastActiveAt: new Date() }).exec();

    next();
  } catch (err) {
    return unauthorized(res, 'Authentication failed');
  }
}

/**
 * Optional authentication — attaches user if token present, continues if not.
 * Used for endpoints that work for both guests and authenticated users.
 */
async function optionalAuthenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      const user    = await User.findOne({ _id: payload.userId, isActive: true }).lean();
      if (user) {
        req.user   = user;
        req.userId = user._id.toString();
      }
    }
  } catch {
    // Silently ignore — optional auth
  }
  next();
}

module.exports = { authenticate, optionalAuthenticate };