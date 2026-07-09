/**
 * contacts.api.ts — F-08
 * All trusted contacts API calls.
 */

import apiClient from './client';

export interface AlertPreferences {
  onJourneyStart: boolean;
  onJourneyEnd:   boolean;
  onDeviation:    boolean;
  onDelay:        boolean;
  onSOS:          boolean;
}

export interface TrustedContact {
  _id:              string;
  contactName:      string;
  contactPhone:     string;
  contactEmail?:    string;
  relationship?:    string;
  status:           'pending' | 'active' | 'declined' | 'revoked';
  invitedAt:        string;
  acceptedAt?:      string;
  alertPreferences: AlertPreferences;
  createdAt:        string;
}

export interface AddContactPayload {
  contactName:   string;
  contactPhone:  string;
  contactEmail?: string;
  relationship?: string;
}

/** GET /contacts */
export async function getContacts(): Promise<TrustedContact[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    data: { contacts: TrustedContact[]; total: number };
  }>('/contacts');
  return data.data.contacts;
}

/** POST /contacts */
export async function addContact(payload: AddContactPayload): Promise<{
  contact: TrustedContact;
  portalUrl: string;
}> {
  const { data } = await apiClient.post<{
    success: boolean;
    data: { contact: TrustedContact; portalUrl: string };
  }>('/contacts', payload);
  return data.data;
}

/** DELETE /contacts/:id */
export async function deleteContact(id: string): Promise<void> {
  await apiClient.delete(`/contacts/${id}`);
}

/** POST /contacts/:id/resend-invite */
export async function resendInvite(id: string): Promise<{ portalUrl: string }> {
  const { data } = await apiClient.post<{
    success: boolean;
    data: { portalUrl: string };
  }>(`/contacts/${id}/resend-invite`);
  return data.data;
}