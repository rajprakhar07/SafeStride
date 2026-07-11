/**
 * journeyStore.ts — F-12
 * Zustand store for active journey state.
 */

import { create } from 'zustand';

export interface Coordinates { lat: number; lng: number }

export interface JourneyLocation extends Coordinates {
  accuracy?:  number;
  speed?:     number | null;
  timestamp?: number;
}

export interface ActiveJourney {
  _id:                   string;
  status:                string;
  estimatedArrival:      string;
  plannedDurationMinutes: number;
  transportMode:         string;
  startLocation:         { coordinates: Coordinates };
  plannedDestination:    { coordinates: Coordinates; formattedAddress?: string };
  hasRoute:              boolean;
  plannedRoute?:         { polyline?: string } | null;
}

interface JourneyState {
  activeJourney:   ActiveJourney | null;
  currentLocation: JourneyLocation | null;
  locationHistory: JourneyLocation[];  // last 20 pings for trail
  eta:             Date | null;
  remainingMeters: number | null;
  remainingMinutes: number | null;
  deviationAlert:  boolean;
  isConnected:     boolean;

  setActiveJourney:   (j: ActiveJourney | null) => void;
  setCurrentLocation: (loc: JourneyLocation)    => void;
  setETA:             (eta: Date, meters: number, minutes: number) => void;
  setDeviationAlert:  (v: boolean)              => void;
  setConnected:       (v: boolean)              => void;
  clearJourney:       ()                        => void;
}

export const useJourneyStore = create<JourneyState>((set) => ({
  activeJourney:    null,
  currentLocation:  null,
  locationHistory:  [],
  eta:              null,
  remainingMeters:  null,
  remainingMinutes: null,
  deviationAlert:   false,
  isConnected:      false,

  setActiveJourney: (j) => set({ activeJourney: j }),

  setCurrentLocation: (loc) =>
    set((state) => ({
      currentLocation: loc,
      locationHistory: [...state.locationHistory.slice(-19), loc],
    })),

  setETA: (eta, meters, minutes) =>
    set({ eta, remainingMeters: meters, remainingMinutes: minutes }),

  setDeviationAlert: (v) => set({ deviationAlert: v }),
  setConnected:      (v) => set({ isConnected: v }),

  clearJourney: () =>
    set({
      activeJourney:    null,
      currentLocation:  null,
      locationHistory:  [],
      eta:              null,
      remainingMeters:  null,
      remainingMinutes: null,
      deviationAlert:   false,
      isConnected:      false,
    }),
}));