import apiClient from './client';

export interface Coordinates { lat: number; lng: number; formattedAddress?: string; }

export interface AnalyzeParams {
  journeyId?: string;
  origin?: Coordinates;
  destination?: Coordinates;
  transportMode?: 'walking' | 'auto' | 'cab' | 'bus' | 'mixed';
  plannedDurationMinutes?: number;
}

export interface SafetyAnalysis {
  unavailable: boolean;
  message?: string;
  safetyScore: number | null;
  riskLevel: 'low' | 'moderate' | 'high' | string | null;
  summary?: string;
  recommendations?: string[];
  concerns?: string[];
  precautions?: string[];
  emergencyTips?: string[];
  disclaimer?: string;
}

export interface ChatResponse {
  unavailable: boolean;
  message?: string;
  reply: string | null;
  disclaimer?: string;
}

export async function analyzeJourneySafety(params: AnalyzeParams): Promise<SafetyAnalysis> {
  const { data } = await apiClient.post('/ai/analyze', params);
  return data.data;
}

export async function askSafetyAssistant(message: string, journeyId?: string): Promise<ChatResponse> {
  const { data } = await apiClient.post('/ai/chat', { message, journeyId });
  return data.data;
}