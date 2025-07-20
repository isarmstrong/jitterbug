import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['node_modules', 'dist'],
    typecheck: {
      tsconfig: './tsconfig.json'
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});