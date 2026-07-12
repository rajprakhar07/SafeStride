/**
 * sosStore.ts — F-21
 * Zustand store for SOS state.
 */

import { create } from 'zustand';
import type { SOSEvent } from '../services/api/sos.api';

interface SOSState {
  isSOSActive:     boolean;
  sosEvent:        SOSEvent | null;
  isCountingDown:  boolean;  // 3-second hold countdown
  countdownSeconds: number;

  setSOSActive:    (event: SOSEvent) => void;
  clearSOS:        () => void;
  setCountdown:    (v: boolean, seconds?: number) => void;
}

export const useSOSStore = create<SOSState>((set) => ({
  isSOSActive:      false,
  sosEvent:         null,
  isCountingDown:   false,
  countdownSeconds: 3,

  setSOSActive: (event) => set({ isSOSActive: true, sosEvent: event, isCountingDown: false }),
  clearSOS:     ()      => set({ isSOSActive: false, sosEvent: null, isCountingDown: false, countdownSeconds: 3 }),
  setCountdown: (v, seconds = 3) => set({ isCountingDown: v, countdownSeconds: seconds }),
}));