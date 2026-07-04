'use strict';

/**
 * LocationPing.js — F-02
 * Collection: location_pings
 * Schema exactly matches PROJECT_CONTEXT.md §13
 *
 * Indexes:
 *   - { journeyId: 1, timestamp: -1 }   compound — primary query pattern
 *   - { coordinates: "2dsphere" }        geospatial queries
 *   - TTL: { timestamp: 1 } expireAfterSeconds: 2592000  (30 days)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const LocationPingSchema = new Schema(
  {
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey', required: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },

    // Flat coordinates for geospatial indexing
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    // GeoJSON point — used for 2dsphere index and spatial queries
    geoPoint: {
      type: {
        type:        String,
        enum:        ['Point'],
        default:     'Point',
      },
      coordinates: {
        type:    [Number], // [lng, lat] — GeoJSON order
        default: undefined,
      },
    },

    accuracy:     { type: Number },           // GPS accuracy in meters
    speed:        { type: Number },           // m/s — null if unavailable
    heading:      { type: Number },           // degrees 0-360 — null if unavailable
    batteryLevel: { type: Number, min: 0, max: 100 },

    timestamp: { type: Date, required: true, default: Date.now },

    // AI anomaly detection flags (set by Python microservice)
    isAnomaly:     { type: Boolean, default: false },
    anomalyReason: { type: String }, // "stopped_unexpectedly", "speed_spike", etc.
  },
  {
    // No timestamps: true — we use our own timestamp field for TTL index
    collection: 'location_pings',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary query: get all pings for a journey ordered by time
LocationPingSchema.index({ journeyId: 1, timestamp: -1 });

// Secondary: get all pings for a user
LocationPingSchema.index({ userId: 1, timestamp: -1 });

// Geospatial: find pings near a location
LocationPingSchema.index({ geoPoint: '2dsphere' });

// TTL: auto-delete pings older than 30 days (2,592,000 seconds)
LocationPingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// ─── Pre-save: sync geoPoint from coordinates ─────────────────────────────────
LocationPingSchema.pre('save', function (next) {
  if (this.coordinates && this.coordinates.lat && this.coordinates.lng) {
    this.geoPoint = {
      type: 'Point',
      coordinates: [this.coordinates.lng, this.coordinates.lat], // GeoJSON: [lng, lat]
    };
  }
  next();
});

module.exports = mongoose.model('LocationPing', LocationPingSchema);