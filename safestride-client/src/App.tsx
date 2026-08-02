/**
 * App.tsx — updated in F-32
 * Adds: PWA shortcut handler, offline banner, lazy route loading.
 *
 * [F-24] Added FcmInitializer — see marked block below. Nothing else changed.
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore }  from './store/authStore';
import apiClient         from './services/api/client';
import { useFakeCall }   from './hooks/useFakeCall';
import { useFcmToken }   from './hooks/useFcmToken'; // [F-24]

// Eager load critical auth screens
import PhoneEntry from './pages/auth/PhoneEntry';
import OTPVerify  from './pages/auth/OTPVerify';

// Lazy load everything else for performance
const Home           = lazy(() => import('./pages/home/Home'));
const ProfileSetup   = lazy(() => import('./pages/onboarding/ProfileSetup'));
const AddressSetup   = lazy(() => import('./pages/onboarding/AddressSetup'));
const ContactsSetup  = lazy(() => import('./pages/onboarding/ContactsSetup'));
const TrustedContacts= lazy(() => import('./pages/contacts/TrustedContacts'));
const StartJourney   = lazy(() => import('./pages/journey/StartJourney'));
const ActiveJourney  = lazy(() => import('./pages/journey/ActiveJourney'));
const JourneyHistory = lazy(() => import('./pages/journey/JourneyHistory'));
const DangerMap      = lazy(() => import('./pages/community/DangerMap'));
const RoutePlanner   = lazy(() => import('./pages/route/RoutePlanner'));
const ContactPortal  = lazy(() => import('./pages/portal/ContactPortal'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const GPSTestPage    = lazy(() => import('./pages/home/GPSTestPage'));

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
    <h2 style={{ color: '#E91E8C' }}>SafeStride — {name}</h2>
  </div>
);

const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
    <div style={{ color: '#E91E8C', fontSize: '1.1rem' }}>Loading…</div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Loading />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function SessionChecker() {
  const { setAuth, setLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) { setLoading(false); return; }
    (async () => {
      try {
        const { data: r } = await apiClient.post('/auth/refresh');
        const token = r.data.accessToken;
        const { data: u } = await apiClient.get('/users/me', { headers: { Authorization: `Bearer ${token}` } });
        const user = u.data.user || u.data;
        setAuth(token, { id: user._id, phone: user.phone, name: user.name || null });
      } catch { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Handle PWA shortcuts (?action=fakecall, ?action=sos)
function ShortcutHandler() {
  const [params] = useSearchParams();
  const { startFakeCall } = useFakeCall();

  useEffect(() => {
    const action = params.get('action');
    if (action === 'fakecall') setTimeout(startFakeCall, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Offline banner
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#1a1a1a', color: '#fff', textAlign: 'center', padding: '0.5rem', fontSize: '0.82rem', zIndex: 99998 }}>
      📵 You are offline — core features still work
    </div>
  );
}
function FcmInitializer() {
  const { isAuthenticated } = useAuthStore();
  useFcmToken(isAuthenticated);
  return null;
}

// [F-24] ── FcmInitializer ──────────────────────────────────────────────────
// Mirrors the SessionChecker/OfflineBanner pattern above: a headless
// component mounted once at the root, reading auth state and doing side
// effects only. Runs useFcmToken() (permission request, token registration,
// foreground listener) once the user is authenticated. Renders nothing.


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <SessionChecker />
      <FcmInitializer />
      <OfflineBanner />
        <SessionChecker />
       
        <OfflineBanner />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login"      element={<PhoneEntry />} />
            <Route path="/verify-otp" element={<OTPVerify />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/"                    element={<><ShortcutHandler /><Home /></>} />
              <Route path="/onboarding/profile"  element={<ProfileSetup />} />
              <Route path="/onboarding/address"  element={<AddressSetup />} />
              <Route path="/onboarding/contacts" element={<ContactsSetup />} />
              <Route path="/contacts"            element={<TrustedContacts />} />
              <Route path="/journey/start"       element={<StartJourney />} />
              <Route path="/journey/active"      element={<ActiveJourney />} />
              <Route path="/journey/history"     element={<JourneyHistory />} />
              <Route path="/community"           element={<DangerMap />} />
              <Route path="/route-planner"       element={<RoutePlanner />} />
              <Route path="/settings"            element={<Placeholder name="Settings" />} />
              <Route path="/admin"               element={<AdminDashboard />} />
              <Route path="/gps-test"            element={<GPSTestPage />} />
            </Route>
            <Route path="/portal/:token" element={<ContactPortal />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}