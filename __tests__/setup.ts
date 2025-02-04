import { vi } from 'vitest';

// Type declarations for test environment
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            EDGE_RUNTIME: string;
            VERCEL_ENV: string;
        }
    }
}

// Mock environment variables
const env = {
    NODE_ENV: "development" as const,
    EDGE_RUNTIME: "edge-runtime",
    VERCEL_ENV: "development",
};

Object.assign(process.env, env);

// Mock performance API for consistent tests
const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(),
    getEntriesByType: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
} as unknown as Performance;

global.performance = mockPerformance;

// Export test utilities
export const resetMocks = () => {
    Object.values(mockPerformance).forEach(mock => {
        if (typeof mock === 'function') {
            mock.mockClear();
        }
    });
}; 