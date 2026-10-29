/// <reference types="vitest" />
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localApi } from './server/devPlugin'

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApi({ root: path.resolve(__dirname, '.data'), env: loadEnv(mode, __dirname, '') })],
  build: {
    target: 'es2020',
    rollupOptions: {
      // The recipient page and the Studio are separate entries, so the page
      // a recipient opens never downloads Studio code.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        studio: path.resolve(__dirname, 'studio.html'),
      },
      // Keep GSAP in its own chunk so app updates don't bust its cache.
      output: { manualChunks: { gsap: ['gsap'] } },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
}))
