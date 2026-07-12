'use strict';

/**
 * sos.service.js — F-20
 * Core SOS cascade logic.
 *
 * T+0s:  Location pinned, SOS event created
 * T+1s:  Push notification sent
 * T+3s:  WhatsApp sent
 * T+5s:  SMS sent
 * T+60s: Follow-up alert if unresolved
 * T+5min: Escalation alert
 */

const SOSEvent            = require('../models/SOSEvent');
const Journey             = require('../models/Journey');
const TrustedContact      = require('../models/TrustedContact');
const notificationService = require('./notification.service');
const { emitToJourneyRoom, emitToPortalRoom } = require('../sockets');
const config              = require('../config/environment');

/**
 * Trigger a full SOS cascade.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string|null} params.journeyId
 * @param {string} params.triggeredBy
 * @param {{ lat: number, lng: number, accuracy?: number }} params.location
 * @returns {Promise<object>} created SOS event
 */
async function triggerSOS({ userId, journeyId, triggeredBy, location }) {
  // 1. Create SOS event in DB immediately
  const sosEvent = await SOSEvent.create({
    userId,
    journeyId:        journeyId || null,
    triggeredBy,
    triggerTimestamp: new Date(),
    location: {
      lat:              location.lat,
      lng:              location.lng,
      accuracy:         location.accuracy || null,
      formattedAddress: null,
    },
    alertsSent: [],
    resolvedAt: null,
    resolvedBy: null,
  });

  const sosId = sosEvent._id.toString();

  // 2. Mark journey as SOS triggered (if active)
  if (journeyId) {
    await Journey.findOneAndUpdate(
      { _id: journeyId, status: 'active' },
      { status: 'sos_triggered' }
    );
  }

  // 3. Build portal URL for SMS/WhatsApp
  const contact    = await TrustedContact.findOne({ userId, status: 'active' }).lean();
  const portalUrl  = contact
    ? `${config.cors.frontendUrl}/portal/[see-invitation]`
    : config.cors.frontendUrl;

  // 4. Emit SOS to Socket.io rooms immediately (T+0)
  if (journeyId) {
    emitToJourneyRoom(journeyId, 'sos:triggered', {
      sosId,
      location,
      timestamp: new Date().toISOString(),
      message:   'SOS triggered',
    });
    emitToPortalRoom(journeyId, 'sos:triggered', {
      sosId,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  // 5. Send notifications with cascade timing
  // T+1s: Push
  setTimeout(() => {
    notificationService.notifySOS(userId, journeyId, location, portalUrl)
      .catch((err) => console.error('SOS notification error:', err.message));
  }, 1000);

  // T+60s: Follow-up if not resolved
  setTimeout(async () => {
    try {
      const current = await SOSEvent.findById(sosId).lean();
      if (current && !current.resolvedAt) {
        console.log(`🚨 SOS follow-up alert for event ${sosId}`);
        await notificationService.notifyContacts({
          userId,
          type:       'sos',
          journeyId,
          pushPayload: {
            title: '🚨 URGENT: SOS Still Active',
            body:  'Your contact still needs help! Please check on them.',
            data:  { type: 'sos_followup', sosId },
          },
          smsBody:     `🚨 URGENT FOLLOW-UP: Your contact's SOS is still active.\nLocation: https://maps.google.com/?q=${location.lat},${location.lng}\nPlease check on them immediately.`,
          sendSMSFlag: true,
        });
      }
    } catch { /* non-critical */ }
  }, 60_000);

  // T+5min: Escalation
  setTimeout(async () => {
    try {
      const current = await SOSEvent.findById(sosId).lean();
      if (current && !current.resolvedAt) {
        console.log(`🚨 SOS escalation alert for event ${sosId}`);
        await notificationService.notifyContacts({
          userId,
          type:       'sos',
          journeyId,
          pushPayload: {
            title: '🚨 ESCALATION: Contact Needs Help',
            body:  '5 minutes have passed. Your contact may be in serious danger.',
            data:  { type: 'sos_escalation', sosId },
          },
          smsBody:     `🚨 ESCALATION: 5 minutes since SOS. Your contact may be in serious danger.\nLocation: https://maps.google.com/?q=${location.lat},${location.lng}`,
          sendSMSFlag: true,
          sendWAFlag:  true,
        });
      }
    } catch { /* non-critical */ }
  }, 5 * 60_000);

  console.log(`🚨 SOS triggered — userId: ${userId} | event: ${sosId} | by: ${triggeredBy}`);
  return sosEvent;
}

/**
 * Resolve an SOS event.
 * @param {string} sosId
 * @param {string} resolvedBy
 * @param {string} notes
 */
async function resolveSOS(sosId, resolvedBy, notes) {
  const sosEvent = await SOSEvent.findByIdAndUpdate(
    sosId,
    { resolvedAt: new Date(), resolvedBy, notes: notes || null },
    { new: true }
  );
  console.log(`✔  SOS ${sosId} resolved by ${resolvedBy}`);
  return sosEvent;
}

module.exports = { triggerSOS, resolveSOS };