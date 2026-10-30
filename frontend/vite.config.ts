import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Za GitHub Pages workflow postavlja VITE_BASE=/projekatInicijativa/; na cPanelu ostaje '/'
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    // Lokalni razvoj priča sa pravim API-jem (nema lokalnog PHP-a). Zahtevi se predstavljaju kao sa sajta,
    // da Sanctum prepozna "front" i pokrene sesiju; kolačić se prepravlja za localhost.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'https://lepsasrbija.com',
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: process.env.VITE_API_PROXY ?? 'https://lepsasrbija.com',
          Referer: (process.env.VITE_API_PROXY ?? 'https://lepsasrbija.com') + '/',
        },
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})
