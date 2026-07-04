'use strict';

/**
 * SOSEvent.js — F-02
 * Collection: sos_events
 * Schema exactly matches PROJECT_CONTEXT.md §13
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AlertSentSchema = new Schema(
  {
    contactId:   { type: Schema.Types.ObjectId, ref: 'TrustedContact', required: true },
    channel:     { type: String, enum: ['push', 'sms', 'whatsapp'], required: true },
    sentAt:      { type: Date },
    delivered:   { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { _id: false }
);

const SOSLocationSchema = new Schema(
  {
    lat:              { type: Number, required: true },
    lng:              { type: Number, required: true },
    accuracy:         { type: Number },
    formattedAddress: { type: String },
  },
  { _id: false }
);

const SOSEventSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey', default: null }, // null if SOS outside journey

    triggeredBy: {
      type: String,
      enum: ['voice_keyword', 'button', 'auto_delay', 'auto_deviation', 'dead_mans_switch'],
      required: true,
    },

    triggerTimestamp: { type: Date, required: true, default: Date.now },

    location: { type: SOSLocationSchema, required: true },

    // Audio recording (only if user gave sosAudioStorageConsent)
    audioRecordingUrl:    { type: String, default: null }, // Cloudinary URL
    audioDurationSeconds: { type: Number },

    alertsSent: { type: [AlertSentSchema], default: [] },

    // Resolution
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, enum: ['user', 'contact', 'auto_timeout'], default: null },
    notes:      { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only createdAt per schema
    collection: 'sos_events',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
SOSEventSchema.index({ userId: 1, createdAt: -1 });
SOSEventSchema.index({ journeyId: 1 }, { sparse: true });
SOSEventSchema.index({ resolvedAt: 1 }, { sparse: true }); // find unresolved SOS events

// ─── Virtual: is this SOS still active (unresolved)? ─────────────────────────
SOSEventSchema.virtual('isActive').get(function () {
  return this.resolvedAt === null;
});

module.exports = mongoose.model('SOSEvent', SOSEventSchema);