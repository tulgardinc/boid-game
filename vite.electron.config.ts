import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist/web',
    emptyOutDir: false,
    target: 'es2020'
  },
  plugins: [
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist/electron/main',
            target: 'node20',
            rollupOptions: { external: [] }
          }
        },
        onstart({ startup }) {
          startup()
        }
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist/electron/preload',
            target: 'node20'
          }
        }
      }
    ]),
    renderer()
  ]
})
