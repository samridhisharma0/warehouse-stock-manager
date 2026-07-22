import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The dev server proxies /api to the backend so the frontend can use relative
// URLs (no CORS juggling in dev). Override the backend target with VITE_API_TARGET.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'motion': ['motion/react'],
          'anime': ['animejs'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'lottie': ['lottie-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    fs: {
      // Allow importing the sibling `shared/` folder that lives outside `client`.
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
