/**
 * risk.api.ts — F-23
 */

import apiClient from './client';

export interface RiskFactor {
  factor:      string;
  score:       number;
  max:         number;
  description: string;
}

export interface RouteRiskScore {
  riskScore:      number;
  riskLevel:      'safe' | 'moderate' | 'high';
  factors:        RiskFactor[];
  recommendation: string;
  dangerSpotCount: number;
}

export interface DangerSpot {
  _id:         string;
  category:    string;
  severity:    string;
  location:    { type: string; coordinates: [number, number] };
  description?: string;
  confirmCount: number;
  activeUntil: string;
}

export async function scoreRoute(params: {
  origin:            { lat: number; lng: number };
  destination:       { lat: number; lng: number };
  transportMode?:    string;
  routeLengthMeters?: number;
}): Promise<RouteRiskScore> {
  const { data } = await apiClient.post<{ success: boolean; data: RouteRiskScore }>(
    '/risk/score-route', params
  );
  return data.data;
}

export async function getDangerSpots(lat: number, lng: number, radius = 500): Promise<DangerSpot[]> {
  const { data } = await apiClient.get<{ success: boolean; data: { spots: DangerSpot[] } }>(
    `/risk/danger-spots?lat=${lat}&lng=${lng}&radius=${radius}`
  );
  return data.data.spots;
}

export async function reportDangerSpot(payload: {
  lat:         number;
  lng:         number;
  category:    string;
  description?: string;
  severity?:   string;
  isAnonymous?: boolean;
}): Promise<void> {
  await apiClient.post('/risk/danger-spots', payload);
}

export async function confirmDangerSpot(id: string): Promise<void> {
  await apiClient.post(`/risk/danger-spots/${id}/confirm`);
}