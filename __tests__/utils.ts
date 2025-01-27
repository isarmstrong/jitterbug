import { EdgeTransportConfig } from '../src/transports/edge';

export function createTestConfig(overrides: Partial<EdgeTransportConfig> = {}): EdgeTransportConfig {
    return {
        endpoint: 'https://test-endpoint.com/logs',
        autoReconnect: false,
        flushInterval: 100,
        maxRetries: 0,
        batchSize: 5,
        ...overrides // Ensure tests can override defaults safely
    };
} 