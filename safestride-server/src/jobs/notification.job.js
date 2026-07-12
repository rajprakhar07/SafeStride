'use strict';

/**
 * notification.job.js — F-19
 * Bull queue job processors for all notification types.
 * Registers workers for: delay-alert, dead-mans-switch, sos-cascade.
 */

const Journey             = require('../models/Journey');
const TrustedContact      = require('../models/TrustedContact');
const notificationService = require('../services/notification.service');
const { cancelDeadManSwitch, cancelDelayAlert } = require('./queue');
const config              = require('../config/environment');

/**
 * Process a delay alert job.
 * Checks if journey is still active and past ETA — if so, notify contacts.
 */
async function processDelayAlert(job) {
  const { journeyId, userId, bufferMinutes } = job.data;

  console.log(`⏰ Processing delay alert for journey ${journeyId}`);

  // Check if journey is still active
  const journey = await Journey.findOne({ _id: journeyId, status: 'active' }).lean();
  if (!journey) {
    console.log(`✔  Journey ${journeyId} already completed — delay alert cancelled`);
    return;
  }

  // Double-check ETA has actually passed
  const bufferMs     = bufferMinutes * 60 * 1000;
  const etaWithBuffer = new Date(journey.estimatedArrival).getTime() + bufferMs;
  if (Date.now() < etaWithBuffer) {
    console.log(`✔  Journey ${journeyId} not yet delayed — skipping`);
    return;
  }

  // Mark alert as sent on journey
  await Journey.findByIdAndUpdate(journeyId, {
    delayAlertSent:   true,
    delayAlertSentAt: new Date(),
  });

  // Get portal URL for SMS
  const contact = await TrustedContact.findOne({ userId, status: 'active' }).lean();
  const portalUrl = contact
    ? `${config.cors.frontendUrl}/portal/[see-invitation-link]`
    : config.cors.frontendUrl;

  const minutesLate = Math.round((Date.now() - new Date(journey.estimatedArrival).getTime()) / 60000);

  await notificationService.notifyDelay(userId, journeyId, minutesLate, portalUrl);
  console.log(`✔  Delay alert sent for journey ${journeyId} (${minutesLate} min late)`);
}

/**
 * Process a dead man's switch job.
 * If no recent ping exists for the journey, trigger a warning.
 * If still no response after another 2 min, trigger full SOS.
 */
async function processDeadMansSwitch(job) {
  const { journeyId, userId } = job.data;

  console.log(`💀 Dead man's switch triggered for journey ${journeyId}`);

  const journey = await Journey.findOne({ _id: journeyId, status: 'active' }).lean();
  if (!journey) {
    console.log(`✔  Journey ${journeyId} no longer active — DMS cancelled`);
    return;
  }

  // Get the most recent ping time from Redis
  const { getRedisClient }  = require('../config/redis');
  const { getLatestPing }   = require('../services/journey.service');
  const latestPing = await getLatestPing(journeyId);

  if (latestPing) {
    console.log(`✔  Recent ping found for journey ${journeyId} — DMS reset`);
    return;
  }

  // No recent ping — send warning push to user
  console.log(`⚠  No recent ping for journey ${journeyId} — sending warning`);

  const contact = await TrustedContact.findOne({ userId, status: 'active' }).lean();
  const portalUrl = contact
    ? `${config.cors.frontendUrl}/portal/[see-invitation-link]`
    : config.cors.frontendUrl;

  // Notify contacts that we lost contact with the user
  await notificationService.notifyContacts({
    userId,
    type:       'delay',
    journeyId,
    pushPayload: {
      title: '⚠️ Lost Contact',
      body:  'SafeStride lost contact with your contact during their journey.',
      data:  { type: 'dms', journeyId },
    },
    smsBody:     `⚠️ SAFESTRIDE: We lost contact with your contact during their journey.\nLast known location: ${portalUrl}`,
    sendSMSFlag: true,
  });

  console.log(`✔  DMS warning sent for journey ${journeyId}`);
}

/**
 * Register all job processors on their respective queues.
 * Call this once on server startup.
 *
 * @param {object} queues — { criticalQueue, highQueue }
 */
function registerJobProcessors({ criticalQueue, highQueue }) {
  // Process delay alerts
  highQueue().process('delay-alert', 5, async (job) => {
    await processDelayAlert(job);
  });

  // Process dead man's switch
  criticalQueue().process('dead-mans-switch', 10, async (job) => {
    await processDeadMansSwitch(job);
  });

  console.log('✔  Bull queue job processors registered');
}

module.exports = { registerJobProcessors, processDelayAlert, processDeadMansSwitch };