import { useEffect } from 'react';
import {
  requestNotificationPermission,
  setupForegroundMessageHandler,
} from '../services/notification.service';

export function useFcmToken(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    async function initFCM() {
      try {
        const token = await requestNotificationPermission();

        if (token) {
          console.log('[FCM] Token registered successfully');
        }

        await setupForegroundMessageHandler((payload) => {
          console.log('[FCM] Foreground notification:', payload);

          if (payload.notification) {
            new Notification(
              payload.notification.title ?? 'SafeStride',
              {
                body: payload.notification.body ?? '',
              }
            );
          }
        });
      } catch (err) {
        console.error('[FCM]', err);
      }
    }

    initFCM();
  }, [isAuthenticated]);
}