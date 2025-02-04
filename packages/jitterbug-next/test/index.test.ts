import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJitterbugLogger } from '../src';

// Mock the jitterbug factory
vi.mock('@jitterbug', () => ({
    factory: {
        create: vi.fn().mockImplementation((config) => ({
            ...config,
            info: vi.fn(),
            error: vi.fn()
        }))
    },
    Environment: {
        DEVELOPMENT: 'DEVELOPMENT',
        STAGING: 'STAGING',
        PRODUCTION: 'PRODUCTION',
        TEST: 'TEST'
    },
    Runtime: {
        EDGE: 'EDGE',
        NODE: 'NODE',
        BROWSER: 'BROWSER'
    }
}));

describe('createJitterbugLogger', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('should create a logger with default config', () => {
        const logger = createJitterbugLogger();
        expect(logger).toBeDefined();
    });

    it('should create a logger with custom config', () => {
        const logger = createJitterbugLogger({
            namespace: 'test',
            environment: 'STAGING',
            runtime: 'NODE',
            endpoint: 'https://logs.example.com'
        });
        expect(logger).toBeDefined();
    });

    it('should detect environment correctly', () => {
        vi.stubEnv('NODE_ENV', 'production');

        const logger = createJitterbugLogger({
            namespace: 'test'
        });

        expect(logger).toHaveProperty('environment', 'PRODUCTION');

        vi.unstubAllEnvs();
    });

    it('should detect runtime correctly', () => {
        const logger = createJitterbugLogger({
            namespace: 'test'
        });

        expect(logger).toHaveProperty('runtime', 'EDGE');
    });

    it('should allow overriding defaults', () => {
        const logger = createJitterbugLogger({
            namespace: 'test',
            environment: 'STAGING',
            runtime: 'NODE',
            endpoint: '/custom/logs'
        });

        expect(logger).toHaveProperty('environment', 'STAGING');
        expect(logger).toHaveProperty('runtime', 'NODE');
    });
}); 