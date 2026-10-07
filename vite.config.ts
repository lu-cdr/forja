/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Porta fixa: os dados do IndexedDB ficam presos à origem (host + porta).
// Trocar a porta = começar com o banco vazio.
const PORT = 5173

export default defineConfig({
  // GitHub Pages serve em /<repo>/; Cloudflare/Netlify em /. Definido no build via BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  server: { port: PORT, strictPort: true },
  preview: { port: 4173, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: true },
      // PNGs gerados por `npm run icons` (scripts/make-icons.mjs)
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Forja — Treino & Progresso',
        short_name: 'Forja',
        description: 'Registro de treinos e acompanhamento físico, 100% local.',
        lang: 'pt-BR',
        theme_color: '#14110e',
        background_color: '#14110e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
})
