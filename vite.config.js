import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// /api goes to the BUY SUN server (server/ folder, `npm run dev` there).
// On the real server the web server in front forwards /api the same way.
const api = { '/api': 'http://127.0.0.1:3001' }

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    rollupOptions: {
      // The site and the manager cabinet (/admin/)
      input: {
        site: resolve(__dirname, 'index.html'),
        cabinet: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
})
