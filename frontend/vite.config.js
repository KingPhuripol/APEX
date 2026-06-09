import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    proxy: {
      // APEX Secure Auth Provider (:3001)
      '/api/auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/api'),
      },
      // AXIA — Brain CT (Flask :5001, avoids macOS AirPlay on :5000)
      '/api/axia': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/axia/, ''),
        timeout: 300_000,
      },
      // SmartLiva — Liver Ultrasound (FastAPI :8000)
      '/api/smartliva': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smartliva/, ''),
        timeout: 120_000,
      },
      // PICHA — Pathology (Node :8005 or via docker)
      '/api/picha': {
        target: 'http://127.0.0.1:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/picha/, ''),
        timeout: 300_000,
      },
      // APEX Core Orchestrator (Flask :5001)
      '/api/core': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        timeout: 300_000,
      },
    },
  },
})
