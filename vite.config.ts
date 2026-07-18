/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/snaredusk/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
