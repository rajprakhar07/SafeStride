/**
 * useSOS.ts — F-21
 * Hook for triggering and resolving SOS.
 */

import { useCallback, useRef } from 'react';
import { useSOSStore }    from '../store/sosStore';
import { useJourneyStore } from '../store/journeyStore';
import { triggerSOS, resolveSOS } from '../services/api/sos.api';

export function useSOS() {
  const { setSOSActive, clearSOS, setCountdown } = useSOSStore();
  const activeJourney = useJourneyStore((s) => s.activeJourney);
  const currentLocation = useJourneyStore((s) => s.currentLocation);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);

  /**
   * Start the 3-second hold countdown.
   * If user holds for 3 seconds, SOS fires.
   * If they release early, countdown cancels.
   */
  const startHold = useCallback(() => {
    let seconds = 3;
    setCountdown(true, seconds);

    countdownTimerRef.current = setInterval(() => {
      seconds -= 1;
      setCountdown(true, seconds);
      if (seconds <= 0) {
        clearInterval(countdownTimerRef.current!);
        fireSOSNow();
      }
    }, 1000);
  }, []);

  const cancelHold = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setCountdown(false, 3);
  }, []);

  const fireSOSNow = useCallback(async () => {
    // Get current location from journey store or fallback
    const loc = currentLocation
      ? { lat: currentLocation.lat, lng: currentLocation.lng, accuracy: currentLocation.accuracy }
      : { lat: 0, lng: 0 }; // will be replaced by real GPS in production

    try {
      const sosEvent = await triggerSOS({
        journeyId:   activeJourney?._id || null,
        triggeredBy: 'button',
        location:    loc,
      });
      setSOSActive(sosEvent);
    } catch (err) {
      console.error('SOS trigger failed:', err);
      // Still show SOS UI even if API fails
      setSOSActive({
        _id:              'local-sos',
        triggeredBy:      'button',
        triggerTimestamp: new Date().toISOString(),
        location:         loc,
        resolvedAt:       null,
        resolvedBy:       null,
      });
    }
  }, [activeJourney, currentLocation, setSOSActive]);

  const resolveSOSHandler = useCallback(async (sosId: string) => {
    try {
      await resolveSOS(sosId, 'User confirmed safe');
    } catch { /* non-critical */ } finally {
      clearSOS();
    }
  }, [clearSOS]);

  return { startHold, cancelHold, fireSOSNow, resolveSOSHandler };
}