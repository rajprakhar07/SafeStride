/**          DO NOT SHARE TO ANYONE THIS FILE 
 * 
 * 
 * 
 * public/firebase-messaging-sw.js
 * TASK 1 — Frontend FCM only.
 *
 * Handles push notifications when the SafeStride tab is NOT in focus
 * (backgrounded, minimized, or the browser is closed on some platforms).
 *
 * IMPORTANT: This file lives in /public and is served as a static asset —
 * Vite does NOT process it, so `import.meta.env` is not available here.
 * Firebase's web config values are safe to hardcode: they identify your
 * project publicly and are not secrets (same values as src/config/firebase.ts).
 *
 * >>> REPLACE the placeholders below with your actual Firebase Web config <<<
 * (Firebase Console → Project Settings → General → Your apps → SDK config)
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:'AIzaSyDZbu6S8YARVoBCEExHWEgEog4x9M1YkrU',
  authDomain: 'safestride-bb54f.firebaseapp.com',
  projectId: 'safestride-bb54f',
  messagingSenderId: '202252328915',
  appId: '1:202252328915:web:ed6603909e52997189d926',
});

const messaging = firebase.messaging();

// ── Background message handler ─────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || 'SafeStride Alert';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.type || 'safestride-alert',
    requireInteraction: payload.data?.type === 'sos', // SOS alerts stay on screen until dismissed
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

// ── Notification click handler ─────────────────────────────────────────────
// Opens (or focuses) the SafeStride app/portal at the relevant URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickUrl = event.notification.data?.clickUrl || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a SafeStride tab is already open, focus it and navigate.
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(clickUrl);
          return;
        }
      }
      // Otherwise open a new tab/window.
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickUrl);
      }
    })
  );
});