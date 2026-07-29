import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 4174,
    proxy: {
      '/api': {
        target: 'https://zetahub.co.uk',
        changeOrigin: true,
        secure: true,
        ws: true,
        headers: {
          Origin: 'https://zetahub.co.uk'
        }
      }
    }
  }
})
