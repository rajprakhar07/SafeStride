/**
 * notification.service.ts — F-17
 * Frontend: request push permission + save FCM token to backend.
 *
 * In development without Firebase config: permission request is skipped gracefully.
 */

import apiClient from './api/client';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const API_KEY   = import.meta.env.VITE_FIREBASE_API_KEY;

let messagingInstance: unknown = null;

/**
 * Initialize Firebase messaging (lazy — only when keys are available).
 */
async function getMessaging() {
  if (!API_KEY || API_KEY === 'your_firebase_api_key') {
    console.log('⚠  Firebase not configured — push notifications disabled');
    return null;
  }

  if (messagingInstance) return messagingInstance;

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging: getFCMMessaging } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    messagingInstance = getFCMMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('Firebase messaging init failed:', err);
    return null;
  }
}

/**
 * Request push notification permission and save FCM token to backend.
 * Call this once after user logs in.
 *
 * @returns {Promise<string|null>} FCM token or null if not supported/denied
 */
export async function requestNotificationPermission(): Promise<string | null> {
  // Check browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.log('Push notifications not supported in this browser');
    return null;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  const messaging = await getMessaging();
  if (!messaging) return null;

  try {
    const { getToken } = await import('firebase/messaging');
    // @ts-ignore
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      // Save token to backend
      await saveFCMToken(token);
      return token;
    }
    return null;
  } catch (err) {
    console.warn('Failed to get FCM token:', err);
    return null;
  }
}

/**
 * Save FCM token to backend user profile.
 */
export async function saveFCMToken(token: string): Promise<void> {
  try {
    await apiClient.patch('/users/me', { fcmToken: token });
  } catch { /* non-critical */ }
}

/**
 * Handle foreground push messages (app is open).
 */
export async function setupForegroundMessageHandler(
  _onMessage: (payload: { notification?: { title?: string; body?: string } }) => void
): Promise<void> {
  const messaging = await getMessaging();
  if (!messaging) return;

  try {
    const { onMessage } = await import('firebase/messaging');
    // @ts-ignore
    onMessage(messaging, _onMessage);
  } catch { /* ignore */ }
}