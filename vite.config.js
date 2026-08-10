import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  define: {
    __APP_CONFIG__: {
      apiBase: process.env.VITE_API_BASE || '/api',
    },
  },
})
