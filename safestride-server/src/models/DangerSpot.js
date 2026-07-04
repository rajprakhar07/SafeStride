'use strict';

/**
 * DangerSpot.js — F-02
 * Collection: danger_spots
 * Schema exactly matches PROJECT_CONTEXT.md §13
 *
 * Uses GeoJSON Point for 2dsphere geospatial index.
 * Supports anonymous reports (reportedBy: null).
 * Auto-expires 30 days after creation unless reconfirmed.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const DangerSpotSchema = new Schema(
  {
    reportedBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null, // null = anonymous
      sparse:  true,
    },
    isAnonymous: { type: Boolean, default: false },

    // GeoJSON Point — [lng, lat] order (GeoJSON standard)
    location: {
      type: {
        type:    String,
        enum:    ['Point'],
        default: 'Point',
      },
      coordinates: {
        type:     [Number], // [lng, lat]
        required: true,
      },
    },

    radius: { type: Number, default: 100, min: 10, max: 1000 }, // meters

    category: {
      type:     String,
      enum:     ['harassment', 'poor_lighting', 'isolated_area', 'accident_prone', 'other'],
      required: true,
    },

    description: { type: String, trim: true, maxlength: 500 },

    severity: {
      type:    String,
      enum:    ['low', 'medium', 'high'],
      default: 'medium',
    },

    // Community confirmation
    confirmedBy:  { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    confirmCount: { type: Number, default: 0, min: 0 },

    // Lifecycle
    activeFrom:  { type: Date, default: Date.now },
    activeUntil: { type: Date }, // set to 30 days from creation
    isActive:    { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'danger_spots' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
DangerSpotSchema.index({ location: '2dsphere' });           // geospatial queries
DangerSpotSchema.index({ isActive: 1, category: 1 });       // filter by active + type
DangerSpotSchema.index({ activeUntil: 1 }, { sparse: true }); // cleanup job

// ─── Pre-save: set activeUntil to 30 days from now on first save ──────────────
DangerSpotSchema.pre('save', function (next) {
  if (this.isNew && !this.activeUntil) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    this.activeUntil = new Date(Date.now() + thirtyDays);
  }
  next();
});

// ─── Instance methods ─────────────────────────────────────────────────────────

/** Add a confirmation from a user (no duplicates) */
DangerSpotSchema.methods.addConfirmation = async function (userId) {
  const alreadyConfirmed = this.confirmedBy.some(
    (id) => id.toString() === userId.toString()
  );
  if (!alreadyConfirmed) {
    this.confirmedBy.push(userId);
    this.confirmCount += 1;
    // Extend activeUntil by 30 days from now on each confirmation
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    this.activeUntil = new Date(Date.now() + thirtyDays);
    return this.save();
  }
  return this;
};

module.exports = mongoose.model('DangerSpot', DangerSpotSchema);