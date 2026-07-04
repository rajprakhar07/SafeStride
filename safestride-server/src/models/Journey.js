'use strict';

/**
 * Journey.js — F-02
 * Collection: journeys
 * Schema exactly matches PROJECT_CONTEXT.md §13
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const CoordinatesSchema = new Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const LocationPointSchema = new Schema(
  {
    coordinates:      { type: CoordinatesSchema },
    formattedAddress: { type: String, trim: true },
    timestamp:        { type: Date },
  },
  { _id: false }
);

const PlannedRouteSchema = new Schema(
  {
    polyline:       { type: String },       // encoded Google Maps polyline
    distanceMeters: { type: Number },
    riskScore:      { type: Number, min: 0, max: 100 },
    riskLevel:      { type: String, enum: ['safe', 'moderate', 'high'] },
  },
  { _id: false }
);

const DeviationSchema = new Schema(
  {
    timestamp:       { type: Date, required: true },
    location:        { type: CoordinatesSchema },
    deviationMeters: { type: Number },
    alertSent:       { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const JourneySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type:     String,
      enum:     ['active', 'completed', 'cancelled', 'sos_triggered', 'alert_sent'],
      default:  'active',
      index:    true,
    },

    startLocation:      { type: LocationPointSchema, required: true },
    endLocation:        { type: LocationPointSchema },         // null while active
    plannedDestination: { type: LocationPointSchema, required: true },

    plannedDurationMinutes: { type: Number, required: true, min: 1 },
    estimatedArrival:       { type: Date, required: true },
    actualArrival:          { type: Date },

    initiatedBy: {
      type: String,
      enum: ['voice', 'manual'],
      default: 'manual',
    },
    voiceTranscript: { type: String }, // raw voice input

    plannedRoute: { type: PlannedRouteSchema },

    deviations: { type: [DeviationSchema], default: [] },

    delayAlertSent:   { type: Boolean, default: false },
    delayAlertSentAt: { type: Date },

    trustedContactsNotified: [{ type: Schema.Types.ObjectId, ref: 'TrustedContact' }],

    transportMode: {
      type: String,
      enum: ['walking', 'auto', 'cab', 'bus', 'mixed'],
      default: 'walking',
    },
  },
  { timestamps: true, collection: 'journeys' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
JourneySchema.index({ userId: 1, status: 1 });
JourneySchema.index({ userId: 1, createdAt: -1 });
JourneySchema.index({ status: 1, estimatedArrival: 1 }); // for delay alert cron job
JourneySchema.index({ createdAt: -1 });

// ─── Instance methods ─────────────────────────────────────────────────────────

/** Check if ETA has been exceeded */
JourneySchema.methods.isDelayed = function (bufferMinutes = 10) {
  if (this.status !== 'active') return false;
  const bufferMs = bufferMinutes * 60 * 1000;
  return new Date() > new Date(this.estimatedArrival.getTime() + bufferMs);
};

module.exports = mongoose.model('Journey', JourneySchema);