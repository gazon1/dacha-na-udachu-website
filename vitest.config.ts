import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Mirrors the `@/*` path mapping in tsconfig.json so tests import
      // modules exactly the way application code does.
      '@': path.resolve(__dirname, '.'),
    },
  },
})