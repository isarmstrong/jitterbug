const { vi } = require('vitest');

// Mock environment variables
const env = {
    NODE_ENV: 'development',
    EDGE_RUNTIME: 'edge-runtime',
    VERCEL_ENV: 'development'
};

Object.assign(process.env, env);

// Mock performance.now() for consistent tests
global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(),
    getEntriesByType: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
};
