import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      injectManifest: { globPatterns: ['**/*.{js,css,html,woff2,png}'], maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 },
      manifest: {
        name: 'Nocturna',
        short_name: 'Nocturna',
        description: 'Scuola, lavoro, lettura e scrittura in un unico calendario.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#141012',
        theme_color: '#0f0b0d',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1500 },
});
