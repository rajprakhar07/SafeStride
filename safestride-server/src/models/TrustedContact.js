'use strict';

/**
 * TrustedContact.js — F-02
 * Collection: trusted_contacts
 * Schema exactly matches PROJECT_CONTEXT.md §13
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AlertPreferencesSchema = new Schema(
  {
    onJourneyStart: { type: Boolean, default: true },
    onJourneyEnd:   { type: Boolean, default: true },
    onDeviation:    { type: Boolean, default: true },
    onDelay:        { type: Boolean, default: true },
    onSOS:          { type: Boolean, default: true },
  },
  { _id: false }
);

const TrustedContactSchema = new Schema(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactName:  { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    relationship: { type: String, trim: true }, // "Mom", "Friend", "Sister"

    status: {
      type:    String,
      enum:    ['pending', 'active', 'declined', 'revoked'],
      default: 'pending',
      index:   true,
    },

    // Portal access — unique token, no login required
    portalToken:       { type: String, unique: true, sparse: true },
    portalTokenExpiry: { type: Date },

    invitedAt:  { type: Date, default: Date.now },
    acceptedAt: { type: Date },

    alertPreferences: { type: AlertPreferencesSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'trusted_contacts' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
TrustedContactSchema.index({ userId: 1, status: 1 });
// portalToken index declared via unique:true + sparse:true on the field above
TrustedContactSchema.index({ contactPhone: 1 });

// ─── Instance methods ─────────────────────────────────────────────────────────

/** Check if portal token is still valid */
TrustedContactSchema.methods.isPortalTokenValid = function () {
  if (!this.portalToken || !this.portalTokenExpiry) return false;
  return this.portalTokenExpiry > new Date();
};

module.exports = mongoose.model('TrustedContact', TrustedContactSchema);