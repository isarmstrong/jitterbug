import { LogLevels, Runtime, Environment } from '../src/types/enums';

export function createTestEntry(overrides = {}) {
    const { error, ...restOverrides } = overrides;
    const baseEntry = {
        level: LogLevels.INFO,
        message: 'Test message',
        data: {},
        error: null,
        context: {
            timestamp: new Date().toISOString(),
            runtime: Runtime.EDGE,
            environment: Environment.TEST,
            namespace: 'test'
        }
    };

    // Deep merge the overrides with the base entry
    return {
        ...baseEntry,
        ...restOverrides,
        error,
        context: {
            ...baseEntry.context,
            ...(restOverrides.context || {})
        }
    };
}

export function createTestError(message = 'Test error') {
    return new Error(message);
}
