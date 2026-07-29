import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.ico'],
      manifest: {
        name: 'SafeStride — Journey Guardian',
        short_name: 'SafeStride',
        description: 'Walk alone. Never be alone.',
        theme_color: '#E91E8C',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Start Journey', short_name: 'Journey', url: '/journey/start', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Fake Call',     short_name: 'Fake Call', url: '/?action=fakecall', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'SOS',           short_name: 'SOS',      url: '/?action=sos',     icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/api\/v1\/risk\/danger-spots\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'danger-spots',
              expiration: { maxAgeSeconds: 3600 },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    } ),
  ],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'map-vendor':    ['leaflet', 'react-leaflet'],
          'query-vendor':  ['@tanstack/react-query'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  // @ts-ignore - 'test' exists if using Vitest but isn't in standard Vite types
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
} );