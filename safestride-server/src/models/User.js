'use strict';

/**
 * User.js — F-02
 * Collection: users
 * Schema exactly matches PROJECT_CONTEXT.md §13
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const CoordinatesSchema = new Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    label:            { type: String, trim: true },
    coordinates:      { type: CoordinatesSchema },
    formattedAddress: { type: String, trim: true },
  },
  { _id: false }
);

const NotificationChannelsSchema = new Schema(
  {
    push:     { type: Boolean, default: true },
    sms:      { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
  },
  { _id: false }
);

const PreferencesSchema = new Schema(
  {
    voiceSOSKeyword:          { type: String, default: 'help me', trim: true },
    defaultJourneyAlertDelay: { type: Number, default: 10, min: 1, max: 60 },
    fakeCallContactName:      { type: String, default: 'Mom', trim: true },
    notificationChannels:     { type: NotificationChannelsSchema, default: () => ({}) },
    autoStartJourneyVoice:    { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const UserSchema = new Schema(
  {
    phone:         { type: String, required: true, unique: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
    name:          { type: String, trim: true },
    email:         { type: String, trim: true, lowercase: true, sparse: true },
    profilePhoto:  { type: String },

    homeAddress:  { type: AddressSchema },
    workAddress:  { type: AddressSchema },
    savedPlaces:  { type: [AddressSchema], default: [] },

    preferences:  { type: PreferencesSchema, default: () => ({}) },

    fcmToken:               { type: String },
    sosAudioStorageConsent: { type: Boolean, default: false },

    lastActiveAt:       { type: Date },
    isActive:           { type: Boolean, default: true },
    deletedAt:          { type: Date, default: null },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'users' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// phone index is declared via unique:true on the field above — no duplicate needed
UserSchema.index({ isActive: 1 });
UserSchema.index({ deletedAt: 1 },  { sparse: true });
UserSchema.index({ createdAt: -1 });

// ─── Instance methods ─────────────────────────────────────────────────────────
UserSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.fcmToken;
  delete obj.__v;
  if (obj.preferences) delete obj.preferences.voiceSOSKeyword;
  return obj;
};

UserSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.isActive  = false;
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);