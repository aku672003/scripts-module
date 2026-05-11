import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/1818/',
  server: {
    port: 1818,
    proxy: {
      '^(/1818)?/api': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/1818/, '')
      }
    }
  }
})
