'use strict';

/**
 * notification.service.js — F-17
 *
 * Central notification dispatcher.
 * Handles push (FCM), SMS (Twilio), WhatsApp (Twilio) — all in one place.
 *
 * Priority:
 *   - SOS / critical → push + SMS + WhatsApp simultaneously
 *   - Deviation / delay → push + SMS
 *   - Journey start/end → push only
 */

const { sendPushNotification }  = require('../config/firebase');
const TrustedContact            = require('../models/TrustedContact');
const User                      = require('../models/User');
const Alert                     = require('../models/Alert');
const config                    = require('../config/environment');

// ── Twilio (lazy) ─────────────────────────────────────────────────────────────
let twilioClient;
function getTwilio() {
  if (!twilioClient && config.twilio?.accountSid && config.twilio?.authToken) {
    twilioClient = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

async function sendSMS(to, body) {
  const twilio = getTwilio();
  if (twilio && config.isProd) {
    await twilio.messages.create({ body, from: config.twilio.phone, to });
  } else {
    console.log(`\n📱 SMS (dev) to ${to}:\n${body}\n`);
  }
}

async function sendWhatsApp(to, body) {
  const twilio = getTwilio();
  if (twilio && config.isProd) {
    await twilio.messages.create({
      body,
      from: config.twilio.whatsappFrom || 'whatsapp:+14155238886',
      to:   `whatsapp:${to}`,
    });
  } else {
    console.log(`\n💬 WhatsApp (dev) to ${to}:\n${body}\n`);
  }
}

// ── Alert record helpers ──────────────────────────────────────────────────────
async function recordAlert({ type, userId, contactId, journeyId, channel, status, payload }) {
  try {
    await Alert.create({ type, userId, contactId, journeyId, channel, status, payload, attempts: 1, sentAt: new Date() });
  } catch { /* non-critical */ }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

/**
 * Send a notification to all active trusted contacts of a user.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.type — 'sos' | 'deviation' | 'delay' | 'journey_start' | 'journey_end'
 * @param {string} params.journeyId
 * @param {object} params.pushPayload — { title, body, data }
 * @param {string} params.smsBody
 * @param {string} params.whatsappBody
 * @param {boolean} params.sendSMSFlag — whether to send SMS (default: false for journey_start/end)
 * @param {boolean} params.sendWAFlag — whether to send WhatsApp (default: false)
 */
async function notifyContacts({
  userId,
  type,
  journeyId,
  pushPayload,
  smsBody,
  whatsappBody,
  sendSMSFlag   = false,
  sendWAFlag    = false,
}) {
  // Get all active trusted contacts
  const contacts = await TrustedContact.find({ userId, status: 'active' }).lean();
  if (!contacts.length) return;

  // Get user's FCM token for self-notification (optional)
  const user = await User.findById(userId).select('fcmToken').lean();

  const promises = [];

  for (const contact of contacts) {
    // Check contact's alert preferences
    const prefs = contact.alertPreferences || {};
    const shouldNotify = {
      sos:           prefs.onSOS           !== false,
      deviation:     prefs.onDeviation     !== false,
      delay:         prefs.onDelay         !== false,
      journey_start: prefs.onJourneyStart  !== false,
      journey_end:   prefs.onJourneyEnd    !== false,
    };

    if (!shouldNotify[type]) continue;

    // Push notification (always try if contact has FCM token — contacts don't have tokens by default)
    // SMS always for deviation/delay/sos
    if (sendSMSFlag && smsBody && contact.contactPhone) {
      promises.push(
        sendSMS(contact.contactPhone, smsBody)
          .then(() => recordAlert({ type, userId, contactId: contact._id, journeyId, channel: 'sms', status: 'sent', payload: { body: smsBody } }))
          .catch((err) => console.warn(`SMS failed to ${contact.contactPhone}:`, err.message))
      );
    }

    // WhatsApp
    if (sendWAFlag && whatsappBody && contact.contactPhone) {
      promises.push(
        sendWhatsApp(contact.contactPhone, whatsappBody)
          .then(() => recordAlert({ type, userId, contactId: contact._id, journeyId, channel: 'whatsapp', status: 'sent', payload: { body: whatsappBody } }))
          .catch((err) => console.warn(`WhatsApp failed to ${contact.contactPhone}:`, err.message))
      );
    }
  }

  // Also push to the user themselves (for SOS confirmation)
  if (user?.fcmToken && pushPayload) {
    promises.push(
      sendPushNotification(user.fcmToken, pushPayload)
        .catch(() => {})
    );
  }

  await Promise.allSettled(promises);
  console.log(`🔔 Notified ${contacts.length} contact(s) — type: ${type}`);
}

// ── Convenience methods ───────────────────────────────────────────────────────

async function notifyJourneyStart(userId, journeyId, destination) {
  await notifyContacts({
    userId, type: 'journey_start', journeyId,
    pushPayload: {
      title: '🛡️ Journey Started',
      body:  `Your contact has started a journey to ${destination || 'their destination'}`,
      data:  { type: 'journey_start', journeyId },
    },
    smsBody:    null,
    sendSMSFlag: false,
  });
}

async function notifyJourneyEnd(userId, journeyId) {
  await notifyContacts({
    userId, type: 'journey_end', journeyId,
    pushPayload: {
      title: '✅ Journey Completed',
      body:  'Your contact has arrived safely!',
      data:  { type: 'journey_end', journeyId },
    },
    smsBody:    null,
    sendSMSFlag: false,
  });
}

async function notifyDeviation(userId, journeyId, deviationMeters, portalUrl) {
  const body = `⚠️ ALERT: Your contact has deviated ${deviationMeters}m from their planned route.\nTrack live: ${portalUrl}`;
  await notifyContacts({
    userId, type: 'deviation', journeyId,
    pushPayload: {
      title: '⚠️ Route Deviation',
      body:  `Your contact has left their planned route (${deviationMeters}m off)`,
      data:  { type: 'deviation', journeyId },
    },
    smsBody:     body,
    sendSMSFlag: true,
  });
}

async function notifyDelay(userId, journeyId, minutesLate, portalUrl) {
  const body = `⏰ SAFESTRIDE: Your contact is ${minutesLate} minutes late arriving. They may need help.\nTrack live: ${portalUrl}`;
  await notifyContacts({
    userId, type: 'delay', journeyId,
    pushPayload: {
      title: '⏰ Journey Delay',
      body:  `Your contact is ${minutesLate} min late. Please check on them.`,
      data:  { type: 'delay', journeyId },
    },
    smsBody:     body,
    sendSMSFlag: true,
  });
}

async function notifySOS(userId, journeyId, location, portalUrl) {
  const mapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const smsBody =
    `🚨 EMERGENCY: Your contact has triggered an SOS!\n` +
    `Location: ${mapsUrl}\n` +
    `Live track: ${portalUrl}\n` +
    `Please check on them immediately.`;

  const waBody =
    `🚨 *SafeStride Emergency Alert*\n\n` +
    `Your contact needs help!\n\n` +
    `📍 Location: ${mapsUrl}\n` +
    `🗺️ Live tracking: ${portalUrl}\n\n` +
    `Please check on them immediately.`;

  await notifyContacts({
    userId, type: 'sos', journeyId,
    pushPayload: {
      title: '🚨 SOS ALERT',
      body:  'Your contact needs help! Tap to see their location.',
      data:  { type: 'sos', journeyId, lat: String(location.lat), lng: String(location.lng) },
    },
    smsBody,
    whatsappBody: waBody,
    sendSMSFlag:  true,
    sendWAFlag:   true,
  });
}

module.exports = {
  notifyContacts,
  notifyJourneyStart,
  notifyJourneyEnd,
  notifyDeviation,
  notifyDelay,
  notifySOS,
};