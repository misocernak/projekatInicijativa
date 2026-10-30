import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Za GitHub Pages workflow postavlja VITE_BASE=/projekatInicijativa/; na cPanelu ostaje '/'
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
})
