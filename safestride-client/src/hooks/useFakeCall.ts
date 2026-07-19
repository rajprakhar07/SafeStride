/**
 * useFakeCall.ts — F-29
 * Hook for fake incoming call feature.
 *
 * Features:
 *   - Start/answer/end fake call
 *   - Ringtone via Web Audio API (no audio file needed, works offline)
 *   - Caller name from user preferences
 *   - Works without internet connection
 */

import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

export interface UseFakeCallReturn {
  isCallActive:  boolean;
  isAnswered:    boolean;
  callerName:    string;
  startFakeCall: () => void;
  answerCall:    () => void;
  endCall:       () => void;
}

export function useFakeCall(): UseFakeCallReturn {
  const user = useAuthStore((s) => s.user);

  // Get caller name from user preferences, fallback to "Mom"
  const callerName = (user as any)?.preferences?.fakeCallContactName || 'Mom';

  const [isCallActive, setIsCallActive] = useState(false);
  const [isAnswered,   setIsAnswered]   = useState(false);

  const audioCtxRef  = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef       = useRef<GainNode | null>(null);
  const ringtoneTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ringtone using Web Audio API ──────────────────────────────────────────
  function startRingtone() {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type            = 'sine';
      osc.frequency.value = 440; // A4 note
      gain.gain.value     = 0.15;

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      audioCtxRef.current   = ctx;
      oscillatorRef.current = osc;
      gainRef.current       = gain;

      // Simulate ringing pattern: on 0.5s, off 0.3s
      let on = true;
      ringtoneTimer.current = setInterval(() => {
        if (!gainRef.current) return;
        on = !on;
        gainRef.current.gain.value = on ? 0.15 : 0;
      }, on ? 500 : 300);
    } catch {
      // Audio API not available — silently skip
    }
  }

  function stopRingtone() {
    try {
      if (ringtoneTimer.current) {
        clearInterval(ringtoneTimer.current);
        ringtoneTimer.current = null;
      }
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      gainRef.current = null;
    } catch { /* ignore */ }
  }

  // ── Start fake call ───────────────────────────────────────────────────────
  const startFakeCall = useCallback(() => {
    setIsCallActive(true);
    setIsAnswered(false);
    startRingtone();
  }, []);

  // ── Answer call ───────────────────────────────────────────────────────────
  const answerCall = useCallback(() => {
    stopRingtone();
    setIsAnswered(true);

    // Play "caller speaking" audio simulation — ambient noise
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type             = 'sine';
      osc.frequency.value  = 200;
      gain.gain.value      = 0.03; // very quiet
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      audioCtxRef.current   = ctx;
      oscillatorRef.current = osc;
      gainRef.current       = gain;
    } catch { /* ignore */ }
  }, []);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    stopRingtone();
    setIsCallActive(false);
    setIsAnswered(false);
  }, []);

  return { isCallActive, isAnswered, callerName, startFakeCall, answerCall, endCall };
}