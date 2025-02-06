import type { BaseContext, BaseEntry, EnvironmentType, LogLevel, LogTransport, RuntimeType } from '@isarmstrong/jitterbug-core-types';
import { Environment, Runtime } from '@isarmstrong/jitterbug-core-types';

// Import local transports
import { ConsoleTransport } from './transports/console';
import { EdgeTransport } from './transports/edge';
import type { NextLoggerConfig } from './types';
import { detectNextEnvironment, detectNextRuntime } from './utils';

// Transport configurations
export interface EdgeTransportConfig {
    endpoint: string;
    namespace: string;
    environment: string;
    maxRetries?: number;
    retryInterval?: number;
    bufferSize?: number;
    maxEntries?: number;
    testMode?: boolean;
    maxPayloadSize?: number;
    maxConnectionDuration?: number;
}

// Core logger creation
export function createJitterbug(options: {
    namespace: string;
    environment: EnvironmentType;
    runtime: RuntimeType;
    transports: LogTransport[];
}): Record<string, unknown> {
    return { ...options };
}

// Export logger functionality
export function createJitterbugLogger(namespace: string, config: NextLoggerConfig = {}) {
    const environment = config.environment ?? detectNextEnvironment();
    const runtime = config.runtime ?? detectNextRuntime();
    const isDev = environment === Environment.DEVELOPMENT;

    const transports: LogTransport[] = [];

    if (isDev || runtime === Runtime.BROWSER) {
        transports.push(new ConsoleTransport({
            colors: true
        }));
    }

    const endpoint = config.endpoint ?? '/api/logs';
    const transportConfig: EdgeTransportConfig = {
        endpoint,
        namespace,
        environment,
        maxRetries: isDev ? 0 : 5,
        bufferSize: isDev ? 50 : 100,
        maxEntries: isDev ? 100 : 1000,
        testMode: isDev,
        maxPayloadSize: 128 * 1024,
        retryInterval: isDev ? 1000 : 5000,
        maxConnectionDuration: isDev ? 60000 : 4.5 * 60 * 1000
    };

    transports.push(new EdgeTransport(transportConfig));

    return createJitterbug({
        namespace,
        environment,
        runtime,
        transports
    });
}

// Re-export core types
export { Environment, Runtime };
export type { BaseContext, EnvironmentType, BaseEntry as LogEntry, LogLevel, LogTransport, RuntimeType };

// Clean exports
export * from './handlers';
export * from './utils';
export { EdgeTransport };

