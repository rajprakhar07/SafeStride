'use strict';

/**
 * user.controller.js — F-05
 *
 * GET  /api/v1/users/me        — return current user profile
 * PATCH /api/v1/users/me       — update name, addresses, preferences
 * POST /api/v1/users/me/photo  — upload profile photo to Cloudinary
 */

const User = require('../models/User');
const R    = require('../utils/response.utils');
const config = require('../config/environment');

// ─── Cloudinary client (lazy) ─────────────────────────────────────────────────
let cloudinary;
function getCloudinary() {
  if (!cloudinary && config.cloudinary?.url) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({ secure: true });
  }
  return cloudinary;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users/me
 * Returns the full profile of the authenticated user.
 */
async function getMe(req, res, next) {
  try {
    // req.user attached by authenticate middleware (lean object)
    // Re-fetch to get latest data with all fields
    const user = await User.findById(req.userId).lean();
    if (!user) return R.notFound(res, 'User not found');

    // Remove sensitive fields before sending
    delete user.fcmToken;
    if (user.preferences) delete user.preferences.voiceSOSKeyword;
    delete user.__v;

    return R.ok(res, { user }, 'Profile fetched successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/users/me
 * Updates allowed profile fields.
 * Body validated by user.validator.js — only valid fields reach here.
 */
async function updateMe(req, res, next) {
  try {
    const updates = req.body;

    // Merge nested preferences instead of replacing entirely
    if (updates.preferences) {
      const current = await User.findById(req.userId).select('preferences').lean();
      updates.preferences = {
        ...(current?.preferences || {}),
        ...updates.preferences,
        // Merge notification channels sub-object
        notificationChannels: {
          ...(current?.preferences?.notificationChannels || {}),
          ...(updates.preferences.notificationChannels || {}),
        },
      };
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true, lean: true }
    );

    if (!user) return R.notFound(res, 'User not found');

    // Remove sensitive fields
    delete user.fcmToken;
    if (user.preferences) delete user.preferences.voiceSOSKeyword;
    delete user.__v;

    return R.ok(res, { user }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users/me/photo
 * Accepts multipart/form-data with field name "photo".
 * Uploads to Cloudinary, saves URL to user profile.
 *
 * In development (no Cloudinary configured): returns a placeholder URL.
 */
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return R.badRequest(res, 'No photo file provided. Send as multipart/form-data with field "photo".');
    }

    let photoUrl;
    const cloud = getCloudinary();

    if (cloud) {
      // Upload buffer to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloud.uploader.upload_stream(
          {
            folder:         'safestride/avatars',
            public_id:      `user_${req.userId}`,
            overwrite:      true,
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      photoUrl = uploadResult.secure_url;
    } else {
      // Dev fallback: use a placeholder
      photoUrl = `https://ui-avatars.com/api/?name=${req.userId}&background=E91E8C&color=fff&size=400`;
      console.log('⚠  Cloudinary not configured — using placeholder avatar URL');
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { profilePhoto: photoUrl } },
      { new: true, lean: true }
    );

    return R.ok(res, { profilePhoto: user.profilePhoto }, 'Photo uploaded successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe, uploadPhoto };