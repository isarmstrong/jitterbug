import { LogEntry, LogLevel, LogLevels, Transport } from './core';
import { MemoryMetrics } from './ebl/memory';

/**
 * Transport error types
 */
export class TransportError extends Error {
    constructor(message: string, public readonly code: TransportErrorCode) {
        super(message);
        this.name = 'TransportError';
    }
}

export enum TransportErrorCode {
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
    MEMORY_PRESSURE = 'MEMORY_PRESSURE',
    INVALID_STATE = 'INVALID_STATE',
    TIMEOUT = 'TIMEOUT',
    HYDRATION_FAILED = 'HYDRATION_FAILED',
    SERIALIZATION_FAILED = 'SERIALIZATION_FAILED'
}

/**
 * Base transport configuration shared by all transports
 */
export interface TransportConfig {
    enabled?: boolean;
    level?: LogLevel;
    format?: 'json' | 'text';
    errorHandler?: (error: TransportError) => void;
    retryStrategy?: RetryStrategy;
}

export interface RetryStrategy {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

/**
 * Base metrics interface shared by all transports
 */
export interface BaseMetrics {
    messageCount: number;
    avgProcessingTime: number;
    errorCount: number;
    lastErrorTime: number;
    bufferSize: number;
    bufferUsage: number;
    memoryUsage: MemoryMetrics;
}

/**
 * Base transport class that implements common functionality
 */
export abstract class BaseTransport implements Transport {
    protected config: TransportConfig;
    protected retryStrategy: Required<RetryStrategy>;

    constructor(config: TransportConfig) {
        this.config = {
            enabled: true,
            level: LogLevels.INFO,
            format: 'json',
            ...config
        };
        this.retryStrategy = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffFactor: 2,
            ...config.retryStrategy
        };
    }

    abstract write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;

    protected handleError(error: Error, code: TransportErrorCode): void {
        const transportError = error instanceof TransportError ? error : new TransportError(error.message, code);
        this.config.errorHandler?.(transportError);
    }

    protected async withRetry<T>(operation: () => Promise<T>, code: TransportErrorCode): Promise<T> {
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < this.retryStrategy.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                attempt++;
                if (attempt < this.retryStrategy.maxRetries) {
                    const delay = Math.min(
                        this.retryStrategy.baseDelay * Math.pow(this.retryStrategy.backoffFactor, attempt - 1),
                        this.retryStrategy.maxDelay
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new TransportError(
            lastError?.message || 'Operation failed after max retries',
            code
        );
    }

    public isEnabled(): boolean {
        return this.config.enabled ?? true;
    }

    public getLevel(): LogLevel {
        return this.config.level ?? LogLevels.INFO;
    }
}

/**
 * Edge transport specific types
 */
export interface EdgeMetrics extends BaseMetrics {
    backpressureEvents: number;
    lastBackpressureTime: number;
    droppedMessages: number;
    lastDropTime: number;
    debugMetrics: {
        droppedEntries: number;
        highWaterMark: number;
        lowWaterMark: number;
        lastPressureLevel: number;
    };
}

export interface EdgeTransportConfig extends TransportConfig {
    endpoint: string;
    bufferSize?: number;
    maxEntries?: number;
    retryInterval?: number;
    maxRetries?: number;
    maxConnectionDuration?: number;
    maxPayloadSize?: number;
    autoReconnect?: boolean;
    maxConcurrent?: number;
    requestsPerSecond?: number;
    batchSize?: number;
    flushInterval?: number;
    persistQueue?: boolean;
    testMode?: boolean;
    memoryThreshold?: number;
}

/**
 * Hydration transport specific types
 */
export interface HydrationMetrics extends BaseMetrics {
    hydrationAttempts: number;
    hydrationErrors: number;
    suspenseBoundaryUpdates: number;
    serverComponentRenders: number;
    streamingUpdates: number;
    avgHydrationTime: number;
    avgServerRenderTime: number;
    avgStreamingDelay: number;
    contentMismatches: number;
    attributeMismatches: number;
    suspenseMismatches: number;
    lastMismatchTime: number | null;
    componentHydrationMap: Map<string, {
        attempts: number;
        errors: number;
        avgTime: number;
    }>;
}

export interface HydrationConfig extends TransportConfig {
    trackComponents?: boolean;
    maxComponentHistory?: number;
}

/**
 * Shared event types
 */
export interface TransportEvent<T = unknown> {
    type: string;
    timestamp: number;
    data: T;
    error?: Error;
    metadata?: Record<string, unknown>;
}

export interface EdgeEvent extends TransportEvent {
    type: 'connect' | 'disconnect' | 'flush' | 'error' | 'backpressure';
    retryCount?: number;
    batchId?: string;
}

export interface HydrationEvent extends TransportEvent {
    type: 'hydration' | 'server' | 'streaming' | 'suspense' | 'mismatch';
    component?: string;
    duration: number;
    mismatchType?: 'content' | 'attribute' | 'suspense';
    details?: Record<string, unknown>;
}

export interface BatchMetrics {
    size: number;
    entryCount: number;
    processingTime: number;
    retryCount: number;
    success: boolean;
} 