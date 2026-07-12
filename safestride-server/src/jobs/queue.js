'use strict';

/**
 * queue.js — F-19
 * Bull queue setup for background jobs.
 *
 * Queues:
 *   notification:critical  — SOS alerts (no retry limit)
 *   notification:high      — Deviation/delay alerts (3 retries)
 *   notification:normal    — Journey start/end (2 retries)
 *   notification:low       — Invitations, reports (1 retry)
 */

const Bull   = require('bull');
const config = require('../config/environment');

const QUEUE_OPTIONS = {
  redis: config.redis.url,
  defaultJobOptions: {
    removeOnComplete: 100, // keep last 100 completed jobs
    removeOnFail:     50,  // keep last 50 failed jobs
  },
};

let queues = {};

function getQueue(name) {
  if (!queues[name]) {
    queues[name] = new Bull(name, QUEUE_OPTIONS);

    queues[name].on('error', (err) => {
      console.error(`Queue [${name}] error:`, err.message);
    });

    queues[name].on('failed', (job, err) => {
      console.error(`Job [${name}#${job.id}] failed:`, err.message);
    });
  }
  return queues[name];
}

// ── Named queue accessors ──────────────────────────────────────────────────────
const criticalQueue = () => getQueue('notification:critical');
const highQueue     = () => getQueue('notification:high');
const normalQueue   = () => getQueue('notification:normal');
const lowQueue      = () => getQueue('notification:low');

/**
 * Add a delay alert job to the high-priority queue.
 * Scheduled to run at the journey's ETA + buffer.
 *
 * @param {string} journeyId
 * @param {string} userId
 * @param {Date}   estimatedArrival
 * @param {number} bufferMinutes — default 10
 */
async function scheduleDelayAlert(journeyId, userId, estimatedArrival, bufferMinutes = 10) {
  const fireAt  = new Date(estimatedArrival).getTime() + bufferMinutes * 60 * 1000;
  const delayMs = Math.max(0, fireAt - Date.now());

  await highQueue().add(
    'delay-alert',
    { journeyId, userId, estimatedArrival, bufferMinutes },
    {
      delay:    delayMs,
      attempts: 3,
      backoff:  { type: 'exponential', delay: 5000 },
      jobId:    `delay:${journeyId}`, // unique ID — prevents duplicate jobs
    }
  );

  console.log(`⏰ Delay alert scheduled for journey ${journeyId} in ${Math.round(delayMs / 60000)} min`);
}

/**
 * Cancel a scheduled delay alert (called when journey ends normally).
 * @param {string} journeyId
 */
async function cancelDelayAlert(journeyId) {
  try {
    const job = await highQueue().getJob(`delay:${journeyId}`);
    if (job) {
      await job.remove();
      console.log(`✔  Delay alert cancelled for journey ${journeyId}`);
    }
  } catch { /* non-critical */ }
}

/**
 * Schedule a dead man's switch check.
 * Fires if no ping received for > 3 minutes during active journey.
 *
 * @param {string} journeyId
 * @param {string} userId
 * @param {number} delayMinutes — default 3
 */
async function scheduleDeadManSwitch(journeyId, userId, delayMinutes = 3) {
  await criticalQueue().add(
    'dead-mans-switch',
    { journeyId, userId },
    {
      delay:    delayMinutes * 60 * 1000,
      attempts: 1,
      jobId:    `dms:${journeyId}`,
    }
  );
}

/**
 * Reset dead man's switch — cancel existing and schedule new one.
 * Called on every successful ping.
 *
 * @param {string} journeyId
 * @param {string} userId
 */
async function resetDeadManSwitch(journeyId, userId) {
  try {
    const existing = await criticalQueue().getJob(`dms:${journeyId}`);
    if (existing) await existing.remove();
  } catch { /* non-critical */ }
  await scheduleDeadManSwitch(journeyId, userId);
}

/**
 * Cancel dead man's switch (called when journey ends normally).
 * @param {string} journeyId
 */
async function cancelDeadManSwitch(journeyId) {
  try {
    const job = await criticalQueue().getJob(`dms:${journeyId}`);
    if (job) await job.remove();
  } catch { /* non-critical */ }
}

/**
 * Close all queues gracefully (called on server shutdown).
 */
async function closeAllQueues() {
  await Promise.allSettled(Object.values(queues).map((q) => q.close()));
  queues = {};
}

module.exports = {
  criticalQueue,
  highQueue,
  normalQueue,
  lowQueue,
  scheduleDelayAlert,
  cancelDelayAlert,
  scheduleDeadManSwitch,
  resetDeadManSwitch,
  cancelDeadManSwitch,
  closeAllQueues,
};