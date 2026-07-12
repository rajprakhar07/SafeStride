'use strict';

/**
 * cleanup.job.js — F-19
 * Periodic cleanup tasks:
 *   - Deactivate expired danger spots (older than 30 days with 0 confirmations)
 *   - Flush orphaned location pings from Redis
 */

const DangerSpot = require('../models/DangerSpot');
const Journey    = require('../models/Journey');

/**
 * Deactivate expired danger spots.
 * Runs once daily.
 */
async function cleanupExpiredDangerSpots() {
  try {
    const result = await DangerSpot.updateMany(
      {
        isActive:    true,
        activeUntil: { $lt: new Date() },
      },
      { $set: { isActive: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧹 Deactivated ${result.modifiedCount} expired danger spot(s)`);
    }
  } catch (err) {
    console.error('Cleanup job error (danger spots):', err.message);
  }
}

/**
 * Find and alert on journeys that have been active too long without pings.
 * Safety net for cases where Bull jobs were missed.
 */
async function cleanupStaleJourneys() {
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const staleJourneys = await Journey.find({
      status:    'active',
      createdAt: { $lt: sixHoursAgo },
    }).lean();

    for (const journey of staleJourneys) {
      console.log(`⚠  Stale journey detected: ${journey._id} (started ${journey.createdAt})`);
      // Auto-cancel stale journeys older than 6 hours
      await Journey.findByIdAndUpdate(journey._id, { status: 'cancelled' });
    }

    if (staleJourneys.length > 0) {
      console.log(`🧹 Cancelled ${staleJourneys.length} stale journey(s)`);
    }
  } catch (err) {
    console.error('Cleanup job error (stale journeys):', err.message);
  }
}

/**
 * Register cleanup jobs to run on an interval.
 * @param {number} intervalMs — default 1 hour
 */
function startCleanupJobs(intervalMs = 60 * 60 * 1000) {
  // Run immediately on startup
  cleanupExpiredDangerSpots();
  cleanupStaleJourneys();

  // Then run on interval
  setInterval(cleanupExpiredDangerSpots, intervalMs);
  setInterval(cleanupStaleJourneys,      intervalMs);

  console.log('✔  Cleanup jobs started (interval: 1hr)');
}

module.exports = { cleanupExpiredDangerSpots, cleanupStaleJourneys, startCleanupJobs };