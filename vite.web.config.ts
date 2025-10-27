import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    target: 'es2020'
  }
})
