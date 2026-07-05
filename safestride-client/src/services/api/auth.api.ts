/**
 * auth.api.ts — F-04
 * All auth API calls — typed, clean, no raw axios calls in components.
 */

import apiClient from './client';

export interface SendOTPPayload   { phone: string }
export interface VerifyOTPPayload { phone: string; otp: string }

export interface AuthUser {
  id:   string;
  phone: string;
  name:  string | null;
}

export interface VerifyOTPResponse {
  accessToken:        string;
  isNewUser:          boolean;
  onboardingComplete: boolean;
  user:               AuthUser;
}

/** POST /auth/send-otp */
export async function sendOTP(payload: SendOTPPayload): Promise<void> {
  await apiClient.post('/auth/send-otp', payload);
}

/** POST /auth/verify-otp */
export async function verifyOTP(payload: VerifyOTPPayload): Promise<VerifyOTPResponse> {
  const { data } = await apiClient.post<{ success: boolean; data: VerifyOTPResponse }>(
    '/auth/verify-otp',
    payload
  );
  return data.data;
}

/** POST /auth/refresh — cookie sent automatically */
export async function refreshToken(): Promise<string> {
  const { data } = await apiClient.post<{ success: boolean; data: { accessToken: string } }>(
    '/auth/refresh'
  );
  return data.data.accessToken;
}

/** POST /auth/logout */
export async function logout(everywhere = false): Promise<void> {
  await apiClient.post('/auth/logout', { everywhere });
}