import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/submit': {
        target: 'https://mojc72opek.execute-api.us-east-1.amazonaws.com',
        changeOrigin: true,
        rewrite: () => '/prod/submit',
      },
    },
  },
})
