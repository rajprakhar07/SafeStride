'use strict';

/**
 * twilio.js — F-18
 * Twilio client setup for SMS and WhatsApp alerts.
 * Lazy initialization — only created when first needed.
 */

let client;

function getTwilioClient() {
  if (client) return client;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN  ||
    TWILIO_ACCOUNT_SID === 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  ) {
    console.log('⚠  Twilio not configured — SMS/WhatsApp notifications will be logged only');
    return null;
  }

  try {
    client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✔  Twilio client initialized');
    return client;
  } catch (err) {
    console.warn(`⚠  Twilio init failed: ${err.message}`);
    return null;
  }
}

/**
 * Send an SMS message.
 * @param {string} to   — E.164 phone number e.g. +919876543210
 * @param {string} body — message text
 * @returns {Promise<string|null>} Twilio message SID or null
 */
async function sendSMS(to, body) {
  const twilio = getTwilioClient();

  if (!twilio) {
    console.log(`\n📱 SMS (dev mode) → ${to}\n${body}\n`);
    return 'dev-sms-logged';
  }

  try {
    const from = process.env.TWILIO_PHONE;
    const msg  = await twilio.messages.create({ body, from, to });
    console.log(`✔  SMS sent to ${to} — SID: ${msg.sid}`);
    return msg.sid;
  } catch (err) {
    console.error(`✖  SMS failed to ${to}: ${err.message}`);
    return null;
  }
}

/**
 * Send a WhatsApp message via Twilio.
 * @param {string} to   — E.164 phone number (without whatsapp: prefix)
 * @param {string} body — message text (supports basic markdown)
 * @returns {Promise<string|null>} Twilio message SID or null
 */
async function sendWhatsApp(to, body) {
  const twilio = getTwilioClient();

  if (!twilio) {
    console.log(`\n💬 WhatsApp (dev mode) → ${to}\n${body}\n`);
    return 'dev-whatsapp-logged';
  }

  try {
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const msg  = await twilio.messages.create({
      body,
      from,
      to: `whatsapp:${to}`,
    });
    console.log(`✔  WhatsApp sent to ${to} — SID: ${msg.sid}`);
    return msg.sid;
  } catch (err) {
    console.error(`✖  WhatsApp failed to ${to}: ${err.message}`);
    return null;
  }
}

module.exports = { getTwilioClient, sendSMS, sendWhatsApp };