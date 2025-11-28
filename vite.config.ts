import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tsConfigPaths(), tanstackStart(), viteReact()],
  // Externalize server-only modules for browser builds
  ssr: {
    noExternal: ['@tanstack/react-start'],
  },
  optimizeDeps: {
    exclude: ['bun:sqlite'],
  },
  build: {
    rollupOptions: {
      external: ['bun:sqlite'],
    },
  },
})
