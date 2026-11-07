import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite (5173) and Vite forwards /api to the
// LavaLust server, so there are no CORS problems. Start LavaLust with: php lava serve
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
});
