'use strict';

/**
 * firebase.js — F-17
 * Firebase Admin SDK setup for push notifications via FCM.
 *
 * In development without a real service account, push is skipped gracefully.
 */

let admin;
let firebaseApp;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  console.log(
  'Firebase service account loaded:',
  !!process.env.FIREBASE_SERVICE_ACCOUNT
);

  if (!serviceAccountJson || serviceAccountJson === '{"type":"service_account","project_id":"..."}') {
    console.log('⚠  Firebase service account not configured — push notifications disabled');
    return null;
  }

  try {
    admin = require('firebase-admin');

    // Parse the service account JSON
    const serviceAccount = JSON.parse(serviceAccountJson);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✔  Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (err) {
    console.warn(`⚠  Firebase init failed: ${err.message} — push notifications disabled`);
    return null;
  }
}

/**
 * Send a push notification to a single device via FCM token.
 *
 * @param {string} fcmToken — device FCM token
 * @param {object} payload
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {object} [payload.data] — extra key-value pairs sent with notification
 * @returns {Promise<string|null>} FCM message ID, or null if push disabled
 */
async function sendPushNotification(fcmToken, { title, body, data = {} }) {
  if (!fcmToken) return null;

  const app = initFirebase();
  if (!app) {
    // Dev fallback: log to console
    console.log(`\n🔔 PUSH (dev): ${title}\n   ${body}\n   Token: ${fcmToken.slice(0, 20)}...\n`);
    return 'dev-push-logged';
  }

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'safestride_alerts' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (err) {
    // Token might be stale — log but don't crash
    console.warn(`⚠  FCM send failed: ${err.message}`);
    return null;
  }
}

/**
 * Send push to multiple tokens (batch).
 * @param {string[]} tokens
 * @param {object} payload
 */
async function sendPushToMultiple(tokens, payload) {
  if (!tokens?.length) return;
  const results = await Promise.allSettled(
    tokens.map((token) => sendPushNotification(token, payload))
  );
  return results;
}

module.exports = { initFirebase, sendPushNotification, sendPushToMultiple };