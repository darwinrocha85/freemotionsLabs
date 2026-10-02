import { defineConfig } from 'vite'

// Puerto propio con strictPort (mismo criterio que darwin-rocha-portfolio) para no chocar con otros proyectos.
export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
})
