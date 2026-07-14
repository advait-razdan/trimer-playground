import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Served from https://<user>.github.io/trimer-playground/ on GitHub Pages, so asset
  // URLs must be prefixed. Dev server is unaffected (base only rewrites built paths).
  base: '/trimer-playground/',
  plugins: [react(), tailwindcss()],
})
