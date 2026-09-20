import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://j4j0zxkc9a.execute-api.us-east-1.amazonaws.com/dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
