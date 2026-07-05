/**
 * authStore.ts — F-04
 * Zustand store for authentication state.
 *
 * SECURITY: accessToken stored ONLY in memory (Zustand state).
 * Never written to localStorage or sessionStorage.
 * Refresh token lives in httpOnly cookie — inaccessible to JS.
 */

import { create } from 'zustand';
import type { AuthUser } from '../services/api/auth.api';

interface AuthState {
  // State
  accessToken:  string | null;
  user:         AuthUser | null;
  isAuthenticated: boolean;
  isLoading:    boolean;

  // Actions
  setAuth:         (token: string, user: AuthUser) => void;
  setAccessToken:  (token: string) => void;
  logout:          () => void;
  setLoading:      (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state — unauthenticated
  accessToken:     null,
  user:            null,
  isAuthenticated: false,
  isLoading:       true,  // true on app start until session check completes

  // Set full auth state after successful login
  setAuth: (token, user) =>
    set({ accessToken: token, user, isAuthenticated: true, isLoading: false }),

  // Update access token after refresh (keep user)
  setAccessToken: (token) =>
    set((state) => ({ ...state, accessToken: token })),

  // Clear all auth state on logout
  logout: () =>
    set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),
}));