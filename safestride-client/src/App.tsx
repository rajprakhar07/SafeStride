import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

// Pages wired in later feature blocks (F-04+)
const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
    <h2>SafeStride — {name}</h2>
    <p>Implemented in upcoming feature blocks.</p>
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Placeholder name="Home" />} />
          <Route path="/login" element={<Placeholder name="Login" />} />
          <Route path="/portal/:token" element={<Placeholder name="Contact Portal" />} />
          <Route path="*" element={<Placeholder name="404" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
