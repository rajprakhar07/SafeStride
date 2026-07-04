'use strict';

/**
 * Alert.js — F-02
 * Collection: alerts
 * Schema exactly matches PROJECT_CONTEXT.md §13
 *
 * Tracks every notification dispatch attempt — push, SMS, WhatsApp, email.
 * Used by Bull queue processors to track delivery and retry state.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AlertSchema = new Schema(
  {
    type: {
      type:     String,
      enum:     ['sos', 'deviation', 'delay', 'journey_start', 'journey_end', 'invitation'],
      required: true,
      index:    true,
    },

    // References
    userId:     { type: Schema.Types.ObjectId, ref: 'User',           required: true, index: true },
    contactId:  { type: Schema.Types.ObjectId, ref: 'TrustedContact', required: true },
    journeyId:  { type: Schema.Types.ObjectId, ref: 'Journey',        default: null, sparse: true },
    sosEventId: { type: Schema.Types.ObjectId, ref: 'SOSEvent',       default: null, sparse: true },

    // Delivery channel
    channel: {
      type:     String,
      enum:     ['push', 'sms', 'whatsapp', 'email'],
      required: true,
    },

    // Delivery state
    status: {
      type:    String,
      enum:    ['queued', 'sent', 'delivered', 'failed'],
      default: 'queued',
      index:   true,
    },

    payload: { type: Schema.Types.Mixed }, // full message payload stored for retry

    // Retry tracking
    attempts:      { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    errorMessage:  { type: String },

    // Timestamps
    sentAt:      { type: Date },
    deliveredAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'alerts',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
AlertSchema.index({ userId: 1, createdAt: -1 });
AlertSchema.index({ status: 1, attempts: 1 });
// sosEventId and journeyId indexes declared via sparse:true on the fields above
AlertSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Alert', AlertSchema);