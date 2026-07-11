'use strict';

/**
 * notification.service.js — updated in F-18
 * Uses centralized twilio.js for SMS/WhatsApp instead of inline functions.
 */

const { sendPushNotification }        = require('../config/firebase');
const { sendSMS, sendWhatsApp }       = require('../config/twilio');
const TrustedContact                  = require('../models/TrustedContact');
const User                            = require('../models/User');
const Alert                           = require('../models/Alert');

// ── Alert record helper ───────────────────────────────────────────────────────
async function recordAlert({ type, userId, contactId, journeyId, channel, status, payload }) {
  try {
    await Alert.create({
      type, userId, contactId, journeyId,
      channel, status, payload,
      attempts: 1,
      sentAt:   new Date(),
    });
  } catch { /* non-critical */ }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
async function notifyContacts({
  userId,
  type,
  journeyId,
  pushPayload,
  smsBody,
  whatsappBody,
  sendSMSFlag  = false,
  sendWAFlag   = false,
}) {
  const contacts = await TrustedContact.find({ userId, status: 'active' }).lean();
  if (!contacts.length) {
    console.log(`⚠  No active contacts to notify for user ${userId}`);
    return;
  }

  const user = await User.findById(userId).select('fcmToken name').lean();
  const promises = [];

  for (const contact of contacts) {
    const prefs = contact.alertPreferences || {};
    const shouldNotify = {
      sos:           prefs.onSOS          !== false,
      deviation:     prefs.onDeviation    !== false,
      delay:         prefs.onDelay        !== false,
      journey_start: prefs.onJourneyStart !== false,
      journey_end:   prefs.onJourneyEnd   !== false,
    };

    if (!shouldNotify[type]) continue;

    // SMS
    if (sendSMSFlag && smsBody && contact.contactPhone) {
      promises.push(
        sendSMS(contact.contactPhone, smsBody)
          .then((sid) => recordAlert({
            type, userId, contactId: contact._id, journeyId,
            channel: 'sms', status: sid ? 'sent' : 'failed',
            payload: { body: smsBody },
          }))
          .catch((err) => console.error(`SMS error: ${err.message}`))
      );
    }

    // WhatsApp
    if (sendWAFlag && whatsappBody && contact.contactPhone) {
      promises.push(
        sendWhatsApp(contact.contactPhone, whatsappBody)
          .then((sid) => recordAlert({
            type, userId, contactId: contact._id, journeyId,
            channel: 'whatsapp', status: sid ? 'sent' : 'failed',
            payload: { body: whatsappBody },
          }))
          .catch((err) => console.error(`WhatsApp error: ${err.message}`))
      );
    }
  }

  // Push to user's own device
  if (user?.fcmToken && pushPayload) {
    promises.push(
      sendPushNotification(user.fcmToken, pushPayload).catch(() => {})
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
      body:  `Your contact started a journey to ${destination || 'their destination'}`,
      data:  { type: 'journey_start', journeyId },
    },
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
  });
}

async function notifyDeviation(userId, journeyId, deviationMeters, portalUrl) {
  const body = `⚠️ SAFESTRIDE: Your contact has deviated ${deviationMeters}m from their route.\nTrack live: ${portalUrl}`;
  await notifyContacts({
    userId, type: 'deviation', journeyId,
    pushPayload: {
      title: '⚠️ Route Deviation',
      body:  `Your contact left their planned route (${deviationMeters}m off)`,
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
    `🚨 EMERGENCY: Your contact triggered SOS!\n` +
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