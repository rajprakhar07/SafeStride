/**
 * journey.api.ts — F-12
 */

import apiClient from './client';
// Fixed path: added one more level up to reach src/store/
import type { ActiveJourney } from '../../store/journeyStore';

export interface StartJourneyPayload {
  destination:           { lat: number; lng: number; formattedAddress?: string };
  currentLocation:       { lat: number; lng: number };
  plannedDurationMinutes: number;
  transportMode:         'walking' | 'auto' | 'cab' | 'bus' | 'mixed';
  initiatedBy?:          'voice' | 'manual';
}

// ... rest of the file remains the same

export interface JourneyHistoryItem {
  _id:               string;
  status:            string;
  transportMode:     string;
  startLocation:     { coordinates: { lat: number; lng: number }; timestamp: string };
  plannedDestination: { coordinates: { lat: number; lng: number }; formattedAddress?: string };
  estimatedArrival:  string;
  actualArrival?:    string;
  createdAt:         string;
}

export async function startJourney(payload: StartJourneyPayload): Promise<ActiveJourney> {
  const { data } = await apiClient.post<{ success: boolean; data: { journey: ActiveJourney } }>(
    '/journeys/start', payload
  );
  return data.data.journey;
}

export async function getActiveJourney(): Promise<ActiveJourney | null> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: { journey: ActiveJourney } }>(
      '/journeys/active'
    );
    return data.data.journey;
  } catch {
    return null;
  }
}

export async function endJourney(journeyId: string): Promise<void> {
  await apiClient.post(`/journeys/${journeyId}/end`);
}

export async function getJourneyHistory(): Promise<JourneyHistoryItem[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    data: { journeys: JourneyHistoryItem[] };
  }>('/journeys/history');
  return data.data.journeys;
}