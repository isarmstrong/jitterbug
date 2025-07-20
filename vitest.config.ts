import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Test isolation and mocking
    isolate: true,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Timeouts for async operations
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Console filtering for debugging API
    onConsoleLog: (log, type) => {
      // Filter out jitterbug internal logs and vitest noise during testing
      return !log.includes('[jitterbug]') && !log.includes('vitest');
    },
    
    // Setup file for global test configuration
    setupFiles: ['./src/browser/__tests__/setup.ts'],
    
    // Coverage configuration for API testing
    coverage: {
      provider: 'v8',
      include: ['src/browser/**/*.ts'],
      exclude: [
        '**/*.test.ts', 
        '**/__tests__/**',
        '**/types.ts',
        '**/branded-types.ts'
      ],
      reporter: ['text', 'html', 'lcov'],
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
      // Fail if coverage drops below thresholds
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85
      }
    },
    
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