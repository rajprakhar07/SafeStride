/**
 * src/config/firebase.ts
 * TASK 1 — Frontend FCM only.
 *
 * Initializes the Firebase app and Cloud Messaging instance.
 * Does nothing else — no auth, analytics, firestore, etc.
 *
 * Safe by design: `getMessaging()` throws in unsupported environments
 * (SSR, browsers without the Push API, some in-app webviews), so we
 * guard it and export `messaging` as `null` rather than crashing the app.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';


import {
  getMessaging,
  isSupported,
  type Messaging,
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

const app: FirebaseApp =
  getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Lazily-resolved Messaging instance. `null` until `getMessagingInstance()`
 * has been awaited once (isSupported() is async), or if the browser doesn't
 * support FCM at all.
 */
let messagingInstance: Messaging | null = null;
let supportChecked = false;

/**
 * Returns the Messaging instance, or null if this browser/context doesn't
 * support FCM (Safari private mode, some webviews, SSR, etc). Never throws.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (supportChecked) return messagingInstance;

  supportChecked = true;
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[FCM] Firebase Cloud Messaging is not supported in this browser.');
      return null;
    }
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Failed to initialize messaging:', err);
    return null;
  }
}

export { app };