/**
 * App.tsx — F-04
 * Root component with:
 *   - React Router v6 routes
 *   - Protected route guard (redirects to /login if not authenticated)
 *   - Session check on app start (tries refresh token cookie)
 *   - React Query provider
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './store/authStore';
import { refreshToken } from './services/api/auth.api';

// Pages — auth (F-04)
import PhoneEntry from './pages/auth/PhoneEntry';
import OTPVerify  from './pages/auth/OTPVerify';

// Placeholders — implemented in later feature blocks
const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', color: '#333' }}>
    <h2 style={{ color: '#E91E8C' }}>SafeStride — {name}</h2>
    <p style={{ color: '#888' }}>Implemented in upcoming feature block.</p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <div style={{ color: '#E91E8C', fontSize: '1.1rem' }}>Loading…</div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// ─── Session checker — runs once on app start ─────────────────────────────────
function SessionChecker() {
  const { setAuth, setLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false);
      return;
    }

    // Try to restore session using refresh token cookie
    (async () => {
      try {
        const { apiClient } = await import('./services/api/client');
        // Call refresh — cookie sent automatically
        const { data } = await apiClient.post('/auth/refresh');
        const token = data.data.accessToken;

        // Get user profile with new token
        const { data: userData } = await apiClient.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAuth(token, userData.data.user || userData.data);
      } catch {
        // No valid session — stay on login
        setLoading(false);
      }
    })();
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionChecker />
        <Routes>
          {/* ── Public routes (no auth required) ─────────────────────────── */}
          <Route path="/login"      element={<PhoneEntry />} />
          <Route path="/verify-otp" element={<OTPVerify />} />

          {/* ── Protected routes (auth required) ──────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Placeholder name="Home" />} />

            {/* Onboarding — F-06 */}
            <Route path="/onboarding/profile"  element={<Placeholder name="Profile Setup" />} />
            <Route path="/onboarding/address"  element={<Placeholder name="Address Setup" />} />
            <Route path="/onboarding/contacts" element={<Placeholder name="Contacts Setup" />} />

            {/* Journey — F-12 */}
            <Route path="/journey/start"   element={<Placeholder name="Start Journey" />} />
            <Route path="/journey/active"  element={<Placeholder name="Active Journey" />} />
            <Route path="/journey/history" element={<Placeholder name="Journey History" />} />

            {/* Contacts — F-08 */}
            <Route path="/contacts" element={<Placeholder name="Trusted Contacts" />} />

            {/* Community — F-25 */}
            <Route path="/community" element={<Placeholder name="Danger Map" />} />

            {/* Settings */}
            <Route path="/settings" element={<Placeholder name="Settings" />} />

            {/* Admin — F-31 */}
            <Route path="/admin" element={<Placeholder name="Admin Dashboard" />} />
          </Route>

          {/* ── Trusted Contact Portal (token-based, no login) ─────────────── */}
          <Route path="/portal/:token" element={<Placeholder name="Contact Portal" />} />

          {/* ── Redirect root to login if nothing matched ──────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}