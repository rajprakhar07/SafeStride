'use strict';

/**
 * contact.controller.js — F-07
 *
 * POST   /api/v1/contacts              — add trusted contact
 * GET    /api/v1/contacts              — list all contacts
 * DELETE /api/v1/contacts/:id          — remove contact
 * POST   /api/v1/contacts/:id/resend-invite — resend invitation
 * POST   /api/v1/contacts/accept/:token     — accept invitation (no JWT)
 */

const TrustedContact  = require('../models/TrustedContact');
const User            = require('../models/User');
const R               = require('../utils/response.utils');
const { generatePortalToken } = require('../services/auth.service');
const config          = require('../config/environment');

const MAX_CONTACTS = 5;

// ─── Twilio (lazy) ────────────────────────────────────────────────────────────
let twilioClient;
function getTwilio() {
  if (!twilioClient && config.twilio?.accountSid && config.twilio?.authToken) {
    twilioClient = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

async function sendInviteSMS(contact, user, portalUrl) {
  const twilio = getTwilio();
  const userName = user.name || 'Someone';
  const message  =
    `${userName} has added you as a trusted contact on SafeStride — a safety app for women.\n` +
    `You will be notified if ${userName} needs help during her commute.\n` +
    `Accept here: ${portalUrl}`;

  if (twilio && config.isProd) {
    await twilio.messages.create({ body: message, from: config.twilio.phone, to: contact.contactPhone });
  } else {
    console.log(`\n📨 Invite SMS to ${contact.contactPhone}:\n${message}\n`);
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/contacts
 * Add a new trusted contact (max 5).
 */
async function addContact(req, res, next) {
  try {
    const userId = req.userId;
    const { contactName, contactPhone, contactEmail, relationship, alertPreferences } = req.body;

    // 1. Enforce max 5 contacts
    const count = await TrustedContact.countDocuments({
      userId,
      status: { $in: ['pending', 'active'] },
    });
    if (count >= MAX_CONTACTS) {
      return R.badRequest(
        res,
        `You can have a maximum of ${MAX_CONTACTS} trusted contacts.`,
        'MAX_CONTACTS_REACHED'
      );
    }

    // 2. Prevent duplicate phone for same user
    const existing = await TrustedContact.findOne({ userId, contactPhone, status: { $ne: 'revoked' } });
    if (existing) {
      return R.conflict(res, 'This phone number is already added as a trusted contact.');
    }

    // 3. Generate portal token
    const { rawToken, hashedToken, expiry } = await generatePortalToken();

    // 4. Create contact record
    const contact = await TrustedContact.create({
      userId,
      contactName,
      contactPhone,
      contactEmail:     contactEmail || undefined,
      relationship:     relationship || undefined,
      status:           'pending',
      portalToken:      hashedToken,
      portalTokenExpiry: expiry,
      invitedAt:        new Date(),
      alertPreferences: alertPreferences || undefined,
    });

    // 5. Send invite SMS
    const user     = await User.findById(userId).lean();
    console.log("FRONTEND_URL =", config.cors.frontendUrl);
    const portalUrl = `${config.cors.frontendUrl}/portal/${rawToken}`;
    await sendInviteSMS(contact, user, portalUrl);

    // Return contact with raw token (one-time — not stored again)
    return R.created(res, {
      contact: {
        _id:          contact._id,
        contactName:  contact.contactName,
        contactPhone: contact.contactPhone,
        relationship: contact.relationship,
        status:       contact.status,
        invitedAt:    contact.invitedAt,
        alertPreferences: contact.alertPreferences,
      },
      portalUrl, // shown once so user can manually share if needed
    }, 'Trusted contact added and invitation sent');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/contacts
 * List all trusted contacts for the authenticated user.
 */
async function getContacts(req, res, next) {
  try {
    const contacts = await TrustedContact.find(
      { userId: req.userId, status: { $ne: 'revoked' } },
      { portalToken: 0, portalTokenExpiry: 0 } // never expose hashed token
    ).sort({ createdAt: -1 }).lean();

    return R.ok(res, { contacts, total: contacts.length }, 'Contacts fetched successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/contacts/:id
 * Remove (revoke) a trusted contact.
 */
async function deleteContact(req, res, next) {
  try {
    const contact = await TrustedContact.findOne({
      _id:    req.params.id,
      userId: req.userId,
    });

    if (!contact) return R.notFound(res, 'Contact not found');

    contact.status = 'revoked';
    await contact.save();

    return R.ok(res, {}, 'Contact removed successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/contacts/:id/resend-invite
 * Resend invitation SMS to a pending contact.
 */
async function resendInvite(req, res, next) {
  try {
    const contact = await TrustedContact.findOne({
      _id:    req.params.id,
      userId: req.userId,
      status: 'pending',
    });

    if (!contact) return R.notFound(res, 'Pending contact not found');

    // Generate a fresh portal token
    const { rawToken, hashedToken, expiry } = await generatePortalToken();
    contact.portalToken       = hashedToken;
    contact.portalTokenExpiry = expiry;
    contact.invitedAt         = new Date();
    await contact.save();

    const user      = await User.findById(req.userId).lean();
    const portalUrl = `${config.cors.frontendUrl}/portal/${rawToken}`;
    await sendInviteSMS(contact, user, portalUrl);

    return R.ok(res, { portalUrl }, 'Invitation resent successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/contacts/accept/:token
 * Contact accepts invitation — no JWT required, token-based.
 */
async function acceptInvite(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) return R.badRequest(res, 'Token is required');

    const { verifyPortalToken } = require('../services/auth.service');

    // Find all pending contacts and check token match (bcrypt compare)
    const pendingContacts = await TrustedContact.find({ status: 'pending' });

    let matched = null;
    for (const contact of pendingContacts) {
      if (contact.portalToken && await verifyPortalToken(token, contact.portalToken)) {
        matched = contact;
        break;
      }
    }

    if (!matched) {
      return R.notFound(res, 'Invalid or expired invitation link');
    }

    // Check token expiry
    if (matched.portalTokenExpiry && matched.portalTokenExpiry < new Date()) {
      return R.badRequest(res, 'This invitation link has expired. Ask them to resend.', 'TOKEN_EXPIRED');
    }

    matched.status     = 'active';
    matched.acceptedAt = new Date();
    await matched.save();

    // Get the user's name for the response
    const user = await User.findById(matched.userId).select('name phone').lean();

    return R.ok(res, {
      message:     `You are now a trusted contact for ${user?.name || 'this user'}.`,
      contactName: matched.contactName,
      userName:    user?.name || null,
    }, 'Invitation accepted successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { addContact, getContacts, deleteContact, resendInvite, acceptInvite };