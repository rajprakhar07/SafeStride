'use strict';

/**
 * portal.controller.js — F-15
 *
 * GET /api/v1/portal/:token — validate portal token, return journey + user info
 *
 * No JWT required — access controlled by portal token only.
 * Portal token is a bcrypt-hashed 256-bit random value stored per TrustedContact.
 */

const TrustedContact    = require('../models/TrustedContact');
const Journey           = require('../models/Journey');
const User              = require('../models/User');
const { getLatestPing } = require('../services/journey.service');
const { verifyPortalToken } = require('../services/auth.service');
const R                 = require('../utils/response.utils');

/**
 * GET /api/v1/portal/:token
 * Validates the portal token and returns:
 *   - User's name and profile photo
 *   - Active journey details (if any)
 *   - Latest location ping
 */
async function getPortalData(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) return R.badRequest(res, 'Portal token is required');

    // Find matching trusted contact by brute-force bcrypt compare
    // (we must check all pending/active contacts — token is hashed)
    const contacts = await TrustedContact.find({
      status: { $in: ['pending', 'active'] },
    }).lean();

    let matchedContact = null;
    for (const contact of contacts) {
      if (contact.portalToken && await verifyPortalToken(token, contact.portalToken)) {
        matchedContact = contact;
        break;
      }
    }

    if (!matchedContact) {
      return R.notFound(res, 'Invalid or expired portal link');
    }

    // Check token expiry
    if (matchedContact.portalTokenExpiry && new Date(matchedContact.portalTokenExpiry) < new Date()) {
      return R.badRequest(res, 'This portal link has expired', 'TOKEN_EXPIRED');
    }

    // Auto-activate contact if still pending when they open the portal
    if (matchedContact.status === 'pending') {
      await TrustedContact.findByIdAndUpdate(matchedContact._id, {
        status:     'active',
        acceptedAt: new Date(),
      });
    }

    // Get the protected user's profile
    const user = await User.findById(matchedContact.userId)
      .select('name profilePhoto phone')
      .lean();

    if (!user) return R.notFound(res, 'User not found');

    // Get active journey (if any)
    const activeJourney = await Journey.findOne({
      userId: matchedContact.userId,
      status: 'active',
    }).lean();

    // Get latest location ping
    let latestLocation = null;
    if (activeJourney) {
      latestLocation = await getLatestPing(activeJourney._id.toString());
    }

    return R.ok(res, {
      contact: {
        _id:          matchedContact._id,
        contactName:  matchedContact.contactName,
        relationship: matchedContact.relationship,
      },
      user: {
        name:         user.name || 'SafeStride User',
        profilePhoto: user.profilePhoto || null,
        phone:        user.phone,
      },
      journey: activeJourney ? {
        _id:               activeJourney._id,
        status:            activeJourney.status,
        estimatedArrival:  activeJourney.estimatedArrival,
        transportMode:     activeJourney.transportMode,
        plannedDestination: activeJourney.plannedDestination,
        startLocation:     activeJourney.startLocation,
        deviations:        activeJourney.deviations,
        createdAt:         activeJourney.createdAt,
      } : null,
      latestLocation,
      journeyId: activeJourney?._id?.toString() || null,
    }, 'Portal data fetched successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { getPortalData };