import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` matches the GitHub Pages project URL: /<repo-name>/. Trailing slash
// required so import.meta.env.BASE_URL resolves asset paths correctly.
export default defineConfig({
  plugins: [react()],
  base: '/pixi-skia-canvas-app/',
})
