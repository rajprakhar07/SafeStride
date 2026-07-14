/**
 * sos.api.ts — F-21
 */

import apiClient from './client';

export interface SOSLocation { lat: number; lng: number; accuracy?: number }

export interface SOSEvent {
  _id:              string;
  triggeredBy:      string;
  triggerTimestamp: string;
  location:         SOSLocation;
  resolvedAt:       string | null;
  resolvedBy:       string | null;
}

export async function triggerSOS(payload: {
  journeyId?:  string | null;
  triggeredBy: 'voice_keyword' | 'button' | 'auto_delay' | 'auto_deviation' | 'dead_mans_switch';
  location:    SOSLocation;
}): Promise<SOSEvent> {
  const { data } = await apiClient.post<{ success: boolean; data: { sosEvent: SOSEvent } }>(
    '/sos/trigger', payload
  );
  return data.data.sosEvent;
}

export async function resolveSOS(sosId: string, notes?: string): Promise<SOSEvent> {
  const { data } = await apiClient.post<{ success: boolean; data: { sosEvent: SOSEvent } }>(
    `/sos/${sosId}/resolve`,
    { resolvedBy: 'user', notes }
  );
  return data.data.sosEvent;
}

export async function getActiveSOS(): Promise<SOSEvent | null> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: { sosEvent: SOSEvent } }>('/sos/active');
    return data.data.sosEvent;
  } catch {
    return null;
  }
}