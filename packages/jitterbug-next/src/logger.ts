import {
    createJitterbug,
    type LogProcessor,
    type LogTransport,
    Environment,
    Runtime
} from '@isarmstrong/jitterbug';

import { EdgeTransport } from '@isarmstrong/jitterbug/transports/edge';
import { ErrorAggregationProcessor } from '@isarmstrong/jitterbug/processors/error-aggregation';
import { MetricsProcessor } from '@isarmstrong/jitterbug/processors/metrics';
import { createSSETransport } from './transports/sse';
import type { NextLoggerConfig, LogType, LogContext } from './types';
import { detectNextEnvironment, detectNextRuntime } from './utils';
import { ConsoleTransport } from '@isarmstrong/jitterbug/transports/console';

// Export core functionality
export { createJitterbug, Environment, Runtime };

// Export processors
export { ErrorAggregationProcessor, MetricsProcessor };

// Export transports
export { EdgeTransport, createSSETransport };

// Export logger factory
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
    const transportConfig = {
        endpoint,
        maxRetries: isDev ? 0 : 5,
        bufferSize: isDev ? 50 : 100,
        maxEntries: isDev ? 100 : 1000,
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

// Re-export types
export type { LogProcessor, LogType, LogContext };
