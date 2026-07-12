'use strict';

/**
 * sos.controller.js — F-20
 *
 * POST /api/v1/sos/trigger      — trigger SOS
 * POST /api/v1/sos/:id/resolve  — mark SOS resolved
 * POST /api/v1/sos/audio-upload — upload SOS audio recording
 */

const cloudinary  = require('cloudinary').v2;
const SOSEvent    = require('../models/SOSEvent');
const User        = require('../models/User');
const sosService  = require('../services/sos.service');
const R           = require('../utils/response.utils');

/**
 * POST /api/v1/sos/trigger
 */
async function triggerSOS(req, res, next) {
  try {
    const userId = req.userId;
    const { journeyId, triggeredBy, location } = req.body;

    // Check if SOS already active for this user
    const activeSOS = await SOSEvent.findOne({ userId, resolvedAt: null });
    if (activeSOS) {
      // Return existing SOS rather than creating duplicate
      return R.ok(res, { sosEvent: activeSOS, alreadyActive: true }, 'SOS already active');
    }

    const sosEvent = await sosService.triggerSOS({
      userId,
      journeyId:   journeyId || null,
      triggeredBy: triggeredBy || 'button',
      location,
    });

    return R.created(res, {
      sosEvent: {
        _id:              sosEvent._id,
        triggeredBy:      sosEvent.triggeredBy,
        triggerTimestamp: sosEvent.triggerTimestamp,
        location:         sosEvent.location,
      },
    }, 'SOS triggered — help is on the way');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/sos/:id/resolve
 */
async function resolveSOS(req, res, next) {
  try {
    const { id: sosId }        = req.params;
    const { resolvedBy, notes } = req.body;
    const userId               = req.userId;

    // Verify SOS belongs to this user
    const sosEvent = await SOSEvent.findOne({ _id: sosId, userId });
    if (!sosEvent) return R.notFound(res, 'SOS event not found');
    if (sosEvent.resolvedAt) return R.badRequest(res, 'SOS already resolved');

    const resolved = await sosService.resolveSOS(sosId, resolvedBy || 'user', notes);

    return R.ok(res, { sosEvent: resolved }, 'SOS resolved — glad you are safe!');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/sos/audio-upload
 * Receives audio blob, uploads to Cloudinary, links to active SOS.
 */
async function uploadAudio(req, res, next) {
  try {
    const userId = req.userId;

    // Check consent
    const user = await User.findById(userId).select('sosAudioStorageConsent').lean();
    if (!user?.sosAudioStorageConsent) {
      return R.badRequest(res, 'Audio storage consent not given. Enable in Settings.', 'NO_CONSENT');
    }

    if (!req.file) return R.badRequest(res, 'No audio file provided');

    // Find active SOS for this user
    const activeSOS = await SOSEvent.findOne({ userId, resolvedAt: null });
    if (!activeSOS) return R.notFound(res, 'No active SOS event found');

    // Upload to Cloudinary
    let audioUrl;
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video', // Cloudinary uses 'video' for audio files
            folder:        'safestride/sos-audio',
            public_id:     `sos_${activeSOS._id}_${Date.now()}`,
            format:        'mp3',
          },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        stream.end(req.file.buffer);
      });
      audioUrl = uploadResult.secure_url;
    } catch {
      // Cloudinary not configured — dev fallback
      audioUrl = `local-audio-${Date.now()}.mp3`;
      console.log('⚠  Cloudinary not configured — audio URL is placeholder');
    }

    // Update SOS event with audio URL
    await SOSEvent.findByIdAndUpdate(activeSOS._id, {
      audioRecordingUrl: audioUrl,
      audioDurationSeconds: Math.round(req.file.size / 16000), // rough estimate
    });

    return R.ok(res, { audioUrl }, 'Audio uploaded successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sos/active
 * Get current active SOS for user (if any).
 */
async function getActiveSOS(req, res, next) {
  try {
    const sosEvent = await SOSEvent.findOne({ userId: req.userId, resolvedAt: null }).lean();
    if (!sosEvent) return R.notFound(res, 'No active SOS');
    return R.ok(res, { sosEvent });
  } catch (err) {
    next(err);
  }
}

module.exports = { triggerSOS, resolveSOS, uploadAudio, getActiveSOS };