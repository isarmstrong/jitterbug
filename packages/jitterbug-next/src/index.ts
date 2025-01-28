import { LogTransport, createJitterbug, Environment, Runtime } from '@isarmstrong/jitterbug';
import { ConsoleTransport } from '@isarmstrong/jitterbug/transports/console';
import { EdgeTransport, type EdgeTransportConfig } from '@isarmstrong/jitterbug/transports/edge';
import type { NextLoggerConfig } from './types';
import { detectNextEnvironment, detectNextRuntime } from './utils';

// Re-export types
export * from './types';

// Re-export handlers
export * from './handlers';

// Re-export utilities
export * from './utils';

// Export logger functionality
export function createJitterbugLogger(namespace: string, config: NextLoggerConfig = {}) {
    const environment = config.environment ?? detectNextEnvironment();
    const runtime = config.runtime ?? detectNextRuntime();
    const isDev = environment === Environment.DEVELOPMENT;

    // Configure transports based on environment
    const transports: LogTransport[] = [];

    // Add console transport in development or browser
    if (isDev || runtime === Runtime.BROWSER) {
        transports.push(new ConsoleTransport({
            colors: true
        }));
    }

    // Add edge transport with Next.js specific configuration
    const endpoint = config.endpoint ?? '/api/logs';
    const transportConfig: EdgeTransportConfig = {
        endpoint,
        maxRetries: isDev ? 0 : 5,
        bufferSize: isDev ? 50 : 100,
        maxEntries: isDev ? 100 : 1000,
        testMode: isDev,
        maxPayloadSize: 128 * 1024, // 128KB
        retryInterval: isDev ? 1000 : 5000,
        maxConnectionDuration: isDev ? 60000 : 4.5 * 60 * 1000
    };

    transports.push(new EdgeTransport(transportConfig));

    // Create logger with configured transports
    return createJitterbug({
        namespace,
        environment,
        runtime,
        transports
    });
}

export * from './logger';
export * from './transports/sse/factory';
export * from './transports/edge'; 