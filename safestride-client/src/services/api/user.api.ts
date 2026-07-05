/**
 * user.api.ts — F-06
 * All user profile API calls.
 */

import apiClient from './client';

export interface Address {
  label?:            string;
  coordinates?:      { lat: number; lng: number };
  formattedAddress?: string;
}

export interface UserPreferences {
  voiceSOSKeyword?:          string;
  defaultJourneyAlertDelay?: number;
  fakeCallContactName?:      string;
  autoStartJourneyVoice?:    boolean;
  notificationChannels?: {
    push?:     boolean;
    sms?:      boolean;
    whatsapp?: boolean;
  };
}

export interface UserProfile {
  _id:                string;
  phone:              string;
  name?:              string;
  email?:             string;
  profilePhoto?:      string;
  homeAddress?:       Address;
  workAddress?:       Address;
  savedPlaces?:       Address[];
  preferences?:       UserPreferences;
  onboardingComplete: boolean;
  phoneVerified:      boolean;
  sosAudioStorageConsent: boolean;
  createdAt:          string;
  updatedAt:          string;
}

export interface UpdateProfilePayload {
  name?:               string;
  email?:              string;
  homeAddress?:        Address;
  workAddress?:        Address;
  savedPlaces?:        Address[];
  preferences?:        UserPreferences;
  onboardingComplete?: boolean;
  fcmToken?:           string;
}

/** GET /users/me */
export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<{ success: boolean; data: { user: UserProfile } }>('/users/me');
  return data.data.user;
}

/** PATCH /users/me */
export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await apiClient.patch<{ success: boolean; data: { user: UserProfile } }>(
    '/users/me',
    payload
  );
  return data.data.user;
}

/** POST /users/me/photo */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await apiClient.post<{ success: boolean; data: { profilePhoto: string } }>(
    '/users/me/photo',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.data.profilePhoto;
}