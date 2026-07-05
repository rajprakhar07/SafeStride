'use strict';

/**
 * user.routes.js — F-05
 *
 * All routes require authentication (authenticate middleware).
 *
 * GET  /api/v1/users/me        — get profile
 * PATCH /api/v1/users/me       — update profile
 * POST /api/v1/users/me/photo  — upload photo
 */

const express    = require('express');
const multer     = require('multer');
const controller = require('../controllers/user.controller');
const validator  = require('../validators/user.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Multer — memory storage for Cloudinary streaming ─────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ─── All user routes require valid JWT ────────────────────────────────────────
router.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users/me
 * Returns authenticated user's full profile.
 */
router.get('/me', controller.getMe);

/**
 * PATCH /api/v1/users/me
 * Updates name, addresses, preferences, onboardingComplete, etc.
 */
router.patch('/me', validator.validateUpdateProfile, controller.updateMe);

/**
 * POST /api/v1/users/me/photo
 * Uploads profile photo. Field name must be "photo".
 */
router.post('/me/photo', upload.single('photo'), controller.uploadPhoto);

module.exports = router;