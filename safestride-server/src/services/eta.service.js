'use strict';

/**
 * eta.service.js — F-10
 *
 * ETA calculation for active journeys.
 * Recalculates ETA on every location ping based on:
 *   - Remaining distance to destination
 *   - Current speed (if available)
 *   - Average walking speed fallback
 */

const { haversineDistance } = require('../utils/geo.utils');

// Average walking speed fallback (m/s)
const AVG_WALKING_SPEED_MS  = 1.4;  // ~5 km/h
const AVG_AUTO_SPEED_MS     = 8.3;  // ~30 km/h
const AVG_CAB_SPEED_MS      = 11.1; // ~40 km/h

const SPEED_BY_MODE = {
  walking: AVG_WALKING_SPEED_MS,
  auto:    AVG_AUTO_SPEED_MS,
  cab:     AVG_CAB_SPEED_MS,
  bus:     AVG_AUTO_SPEED_MS,
  mixed:   AVG_WALKING_SPEED_MS,
};

/**
 * Calculate updated ETA based on current location and remaining distance.
 *
 * @param {object} params
 * @param {{ lat: number, lng: number }} params.currentLocation
 * @param {{ lat: number, lng: number }} params.destination
 * @param {string} params.transportMode
 * @param {number|null} params.currentSpeed — m/s from GPS, null if unavailable
 * @returns {{ etaDate: Date, remainingMeters: number, remainingMinutes: number }}
 */
function calculateETA({ currentLocation, destination, transportMode, currentSpeed }) {
  const remainingMeters = haversineDistance(
    currentLocation.lat,
    currentLocation.lng,
    destination.lat,
    destination.lng
  );

  // Use GPS speed if reliable (> 0.5 m/s), otherwise use mode average
  const speed =
    currentSpeed && currentSpeed > 0.5
      ? currentSpeed
      : SPEED_BY_MODE[transportMode] || AVG_WALKING_SPEED_MS;

  const remainingSeconds = remainingMeters / speed;
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  const etaDate = new Date(Date.now() + remainingSeconds * 1000);

  return { etaDate, remainingMeters: Math.round(remainingMeters), remainingMinutes };
}

/**
 * Check if a journey is delayed past its estimated arrival.
 *
 * @param {Date} estimatedArrival
 * @param {number} bufferMinutes — grace period before alerting (default 10 min)
 * @returns {boolean}
 */
function isJourneyDelayed(estimatedArrival, bufferMinutes = 10) {
  const bufferMs = bufferMinutes * 60 * 1000;
  return Date.now() > new Date(estimatedArrival).getTime() + bufferMs;
}

module.exports = { calculateETA, isJourneyDelayed };