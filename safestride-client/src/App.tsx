/**
 * App.tsx — updated in F-06
 * Wires onboarding pages + session restore logic.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './store/authStore';
import apiClient from './services/api/client';

// Auth pages (F-04)
import PhoneEntry from './pages/auth/PhoneEntry';
import OTPVerify  from './pages/auth/OTPVerify';

// Onboarding pages (F-06)
import ProfileSetup  from './pages/onboarding/ProfileSetup';
import AddressSetup  from './pages/onboarding/AddressSetup';
import ContactsSetup from './pages/onboarding/ContactsSetup';

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
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

// ─── Session checker ──────────────────────────────────────────────────────────
function SessionChecker() {
  const { setAuth, setLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) { setLoading(false); return; }

    (async () => {
      try {
        const { data: refreshData } = await apiClient.post('/auth/refresh');
        const token = refreshData.data.accessToken;

        const { data: userData } = await apiClient.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userObj = userData.data.user || userData.data;
        setAuth(token, {
          id:    userObj._id,
          phone: userObj.phone,
          name:  userObj.name || null,
        });
      } catch {
        setLoading(false);
      }
    })();
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
          {/* Public */}
          <Route path="/login"      element={<PhoneEntry />} />
          <Route path="/verify-otp" element={<OTPVerify />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Placeholder name="Home" />} />

            {/* Onboarding (F-06) */}
            <Route path="/onboarding/profile"  element={<ProfileSetup />} />
            <Route path="/onboarding/address"  element={<AddressSetup />} />
            <Route path="/onboarding/contacts" element={<ContactsSetup />} />

            {/* Future routes */}
            <Route path="/journey/start"   element={<Placeholder name="Start Journey" />} />
            <Route path="/journey/active"  element={<Placeholder name="Active Journey" />} />
            <Route path="/journey/history" element={<Placeholder name="Journey History" />} />
            <Route path="/contacts"        element={<Placeholder name="Trusted Contacts" />} />
            <Route path="/community"       element={<Placeholder name="Danger Map" />} />
            <Route path="/settings"        element={<Placeholder name="Settings" />} />
            <Route path="/admin"           element={<Placeholder name="Admin Dashboard" />} />
          </Route>

          {/* Portal (token-based) */}
          <Route path="/portal/:token" element={<Placeholder name="Contact Portal" />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}