import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the build works from any folder (domain root or sub-folder on BigRock)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { proxy: { '/api': 'http://127.0.0.1:8080', '/uploads': 'http://127.0.0.1:8080', '/seed': 'http://127.0.0.1:8080' } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 }
})
