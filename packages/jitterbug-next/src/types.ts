import type { Environment, LogEntry, LogLevel, LogTransport, Runtime } from '@isarmstrong/jitterbug-core-types';
import type { LogType } from '@isarmstrong/jitterbug-types';

export { Environment, Runtime };
export type { LogEntry, LogLevel, LogTransport, LogType };

export interface ErrorContext {
    errorId?: string;
    errorType?: string;
    errorMessage?: string;
    stackTrace?: string;
    frequency?: number;
    firstOccurrence?: number;
    lastOccurrence?: number;
    patternId?: string;
    errorGroup?: string;
    similarErrors?: Array<{
        message: string;
        stack?: string;
        timestamp: number;
    }>;
}

export interface LogContext {
    runtime?: string;
    environment?: string;
    namespace?: string;
    timestamp?: string;
    error?: ErrorContext;
    metrics?: {
        samples?: number;
        eventLoop?: {
            lag?: number;
            samples?: number;
        };
        memoryUsage?: {
            heapUsed?: number;
            heapTotal?: number;
            external?: number;
        };
    };
    [key: string]: unknown;
}

export interface LogHandlerConfig {
    /**
     * The maximum number of log entries to keep in memory
     * @default 1000
     */
    maxEntries?: number;

    /**
     * The maximum size of a single log payload in bytes
     * @default 128 * 1024 (128KB)
     */
    maxPayloadSize?: number;

    /**
     * Whether to enable SSE for real-time log streaming
     * Only supported in Next.js 15+ with Node.js runtime
     * @default true in development, false in production
     */
    enableSSE?: boolean;

    /**
     * The maximum duration for SSE connections in milliseconds
     * Only applicable when enableSSE is true
     * Vercel limits: ~10s (Hobby), ~30s (Pro)
     * @default 25000 (25s)
     */
    maxSSEDuration?: number;

    /**
     * Whether to auto-reconnect SSE when maxSSEDuration is reached
     * Only applicable when enableSSE is true
     * @default true
     */
    autoReconnectSSE?: boolean;

    /**
     * Callback for processing logs
     * Use this for custom log handling (e.g., console output in development)
     */
    onLog?: (log: LogType) => void;
}

export interface NextLoggerConfig {
    /**
     * The namespace for the logger
     * @default 'next'
     */
    namespace?: string;

    /**
     * The environment to use
     * @default auto-detected from process.env.NODE_ENV
     */
    environment?: typeof Environment[keyof typeof Environment];

    /**
     * The runtime to use
     * @default auto-detected based on window presence
     */
    runtime?: typeof Runtime[keyof typeof Runtime];

    /**
     * The endpoint to send logs to
     * @default '/api/logs'
     */
    endpoint?: string;

    /**
     * Whether to run in test mode
     * @default false
     */
    testMode?: boolean;

    /**
     * Handler configuration for log processing
     */
    handlerConfig?: LogHandlerConfig;
}

export interface SSETransportConfig {
    endpoint: string;
    forceVersion?: string;
    heartbeatInterval?: number;
    maxDuration?: number;
}
