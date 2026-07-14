import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // relative Pfade: laeuft auf GitHub Pages (user.github.io/repo/), Netlify, Vercel gleichermassen
  base: './',
  server: { port: 5530, strictPort: true },
})
