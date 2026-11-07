/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// '/' for a root domain; '/repo-name/' for a GitHub Pages project site. Set by the deploy workflow.
declare const process: { env: Record<string, string | undefined> } // avoids pulling in all Node types for one variable
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Groundwork — your fitness journal',
        short_name: 'Groundwork',
        description: 'A personal workout companion that keeps everything on your device.',
        theme_color: '#1F3B2D',
        background_color: '#EFE8DA',
        display: 'standalone',
        start_url: base,
        scope: base.replace(/(.)\/$/, '$1'), // '/repo' too, which is where the router's home link points
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
})
