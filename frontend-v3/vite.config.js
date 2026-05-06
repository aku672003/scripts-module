import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8003,
    proxy: {
      '/api': {
        target: 'http://65.1.191.126:1818',
        changeOrigin: true,
      }
    }
  }
})
