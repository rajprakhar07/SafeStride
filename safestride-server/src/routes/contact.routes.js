'use strict';

/**
 * contact.routes.js — F-07
 *
 * POST   /api/v1/contacts                    — add contact (auth required)
 * GET    /api/v1/contacts                    — list contacts (auth required)
 * DELETE /api/v1/contacts/:id                — remove contact (auth required)
 * POST   /api/v1/contacts/:id/resend-invite  — resend invite (auth required)
 * POST   /api/v1/contacts/accept/:token      — accept invite (NO auth — token-based)
 */

const express    = require('express');
const controller = require('../controllers/contact.controller');
const validator  = require('../validators/contact.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Public route (no auth) ───────────────────────────────────────────────────
// MUST be before router.use(authenticate) to stay public
router.post('/accept/:token', controller.acceptInvite);

// ─── All routes below require JWT ─────────────────────────────────────────────
router.use(authenticate);

router.post('/',                    validator.validateAddContact, controller.addContact);
router.get('/',                     controller.getContacts);
router.delete('/:id',               controller.deleteContact);
router.post('/:id/resend-invite',   controller.resendInvite);

module.exports = router;