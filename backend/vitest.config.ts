import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/db/migrate.ts'],
    },
  },
  resolve: {
    alias: {
      '@gpu-cloud/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
