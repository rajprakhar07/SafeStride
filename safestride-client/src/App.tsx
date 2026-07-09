import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './store/authStore';
import apiClient from './services/api/client';

import PhoneEntry from './pages/auth/PhoneEntry';
import OTPVerify  from './pages/auth/OTPVerify';
import ProfileSetup  from './pages/onboarding/ProfileSetup';
import AddressSetup  from './pages/onboarding/AddressSetup';
import ContactsSetup from './pages/onboarding/ContactsSetup';
import TrustedContacts from './pages/contacts/TrustedContacts';
import GPSTestPage from './pages/home/GPSTestPage';

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
    <h2 style={{ color: '#E91E8C' }}>SafeStride — {name}</h2>
    <p style={{ color: '#888' }}>Implemented in upcoming feature block.</p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

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
        setAuth(token, { id: userObj._id, phone: userObj.phone, name: userObj.name || null });
      } catch {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionChecker />
        <Routes>
          <Route path="/login"      element={<PhoneEntry />} />
          <Route path="/verify-otp" element={<OTPVerify />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/"                    element={<Placeholder name="Home" />} />
            <Route path="/onboarding/profile"  element={<ProfileSetup />} />
            <Route path="/onboarding/address"  element={<AddressSetup />} />
            <Route path="/onboarding/contacts" element={<ContactsSetup />} />
            <Route path="/contacts"            element={<TrustedContacts />} />
            <Route path="/gps-test"            element={<GPSTestPage />} />
            <Route path="/journey/start"       element={<Placeholder name="Start Journey" />} />
            <Route path="/journey/active"      element={<Placeholder name="Active Journey" />} />
            <Route path="/journey/history"     element={<Placeholder name="Journey History" />} />
            <Route path="/community"           element={<Placeholder name="Danger Map" />} />
            <Route path="/settings"            element={<Placeholder name="Settings" />} />
            <Route path="/admin"               element={<Placeholder name="Admin Dashboard" />} />
          </Route>
          <Route path="/portal/:token" element={<Placeholder name="Contact Portal" />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}