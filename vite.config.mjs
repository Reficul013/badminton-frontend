// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/badminton-frontend/',            // <- repo name with leading/trailing slash
  define: { 'process.env': {} },           // avoids libs reading process.env
})
