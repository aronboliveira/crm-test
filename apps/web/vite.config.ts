import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const packagesRoot = path.resolve(repoRoot, 'packages')

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@corp/foundations': path.resolve(packagesRoot, 'foundations', 'src', 'index.ts'),
      '@corp/contracts': path.resolve(packagesRoot, 'contracts', 'src', 'index.ts')
    }
  },
  server: { port: 5173, fs: { allow: [repoRoot] } }
})
