/**
 * useGeolocation.ts — F-09
 *
 * GPS tracking hook for SafeStride.
 *
 * Features:
 *   - Uses watchPosition (continuous — not one-shot getCurrentPosition)
 *   - Filters out inaccurate positions (accuracy > 50m)
 *   - Handles permission denied with clear user instructions
 *   - Battery API integration (batteryLevel 0-100)
 *   - Adaptive watch interval based on battery level
 *   - Cleans up watch on unmount
 *
 * Usage:
 *   const { location, error, permissionState, batteryLevel, startWatching, stopWatching } = useGeolocation();
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeolocationData {
  lat:       number;
  lng:       number;
  accuracy:  number;   // meters
  speed:     number | null;   // m/s — null if unavailable
  heading:   number | null;   // degrees 0-360 — null if unavailable
  timestamp: number;          // Unix ms
}

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface UseGeolocationReturn {
  location:        GeolocationData | null;
  error:           string | null;
  permissionState: PermissionState;
  isWatching:      boolean;
  batteryLevel:    number | null;  // 0-100, null if Battery API unavailable
  isLowBattery:    boolean;        // true when batteryLevel < 20
  startWatching:   () => void;
  stopWatching:    () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCURACY_THRESHOLD_METERS = 50;   // ignore positions less accurate than this
const LOW_BATTERY_THRESHOLD     = 20;   // % — switch to power-saving mode

const GPS_OPTIONS_NORMAL: PositionOptions = {
  enableHighAccuracy: true,
  timeout:            15_000,
  maximumAge:         5_000,
};

const GPS_OPTIONS_LOW_BATTERY: PositionOptions = {
  enableHighAccuracy: false,  // less accurate but saves battery
  timeout:            30_000,
  maximumAge:         15_000,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeolocation(): UseGeolocationReturn {
  const [location,        setLocation]        = useState<GeolocationData | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [isWatching,      setIsWatching]      = useState(false);
  const [batteryLevel,    setBatteryLevel]    = useState<number | null>(null);
  const [isLowBattery,    setIsLowBattery]    = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // ── Battery API ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Battery API is not available in all browsers — wrap in try/catch
    if (!('getBattery' in navigator)) return;

    (async () => {
      try {
        // @ts-ignore — Battery API types not in standard TypeScript lib
        const battery = await (navigator as { getBattery: () => Promise<{ level: number; addEventListener: (e: string, h: () => void) => void }> }).getBattery();

        const updateBattery = () => {
          const level = Math.round(battery.level * 100);
          setBatteryLevel(level);
          setIsLowBattery(level < LOW_BATTERY_THRESHOLD);
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
      } catch {
        // Battery API not available — silently ignore
      }
    })();
  }, []);

  // ── Check permission state ───────────────────────────────────────────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermissionState('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionState(result.state as PermissionState);
          result.addEventListener('change', () => {
            setPermissionState(result.state as PermissionState);
          });
        })
        .catch(() => {
          // Permissions API not available — proceed anyway
        });
    }
  }, []);

  // ── Success handler ──────────────────────────────────────────────────────────
  const onSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;

    // Filter out inaccurate positions
    if (accuracy > ACCURACY_THRESHOLD_METERS) {
      console.warn(`⚠ GPS accuracy ${Math.round(accuracy)}m exceeds threshold — skipping ping`);
      return;
    }

    setError(null);
    setPermissionState('granted');
    setLocation({
      lat:       latitude,
      lng:       longitude,
      accuracy:  Math.round(accuracy),
      speed:     speed ?? null,
      heading:   heading ?? null,
      timestamp: position.timestamp,
    });
  }, []);

  // ── Error handler ────────────────────────────────────────────────────────────
  const onError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setPermissionState('denied');
        setError(
          'Location access was denied. To use SafeStride journey tracking, ' +
          'please enable location in your browser settings: ' +
          'Settings → Privacy & Security → Location → Allow for this site.'
        );
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location information is unavailable. Check your GPS signal.');
        break;
      case err.TIMEOUT:
        setError('Location request timed out. Please check your GPS signal and try again.');
        break;
      default:
        setError('An unknown location error occurred.');
    }
  }, []);

  // ── Start watching ───────────────────────────────────────────────────────────
  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPermissionState('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Use power-saving options when battery is low
    const options = isLowBattery ? GPS_OPTIONS_LOW_BATTERY : GPS_OPTIONS_NORMAL;

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    watchIdRef.current = watchId;
    setIsWatching(true);
    setError(null);
  }, [isLowBattery, onSuccess, onError]);

  // ── Stop watching ─────────────────────────────────────────────────────────
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  // ── Restart watch when battery state changes (switch accuracy mode) ──────────
  useEffect(() => {
    if (isWatching) {
      startWatching(); // restart with new options
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLowBattery]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    error,
    permissionState,
    isWatching,
    batteryLevel,
    isLowBattery,
    startWatching,
    stopWatching,
  };
}

export default useGeolocation;