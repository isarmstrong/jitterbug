import type { LogLevel } from '../../types/core';
import type { TransportError } from '../../types/transports';

export interface LogContext {
    timestamp: string;
    level: LogLevel;
    message: string;
    error?: Error;
    metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
    level: LogLevel;
    metadata?: Record<string, unknown>;
    errorHandler?: (error: TransportError) => void;
}

export function createLogger(config: LoggerConfig): {
    debug: (message: string, metadata?: Record<string, unknown>) => void;
    info: (message: string, metadata?: Record<string, unknown>) => void;
    warn: (message: string, metadata?: Record<string, unknown>) => void;
    error: (message: string, error: Error, metadata?: Record<string, unknown>) => void;
} {
    const { metadata: defaultMetadata = {} } = config;

    const log = (
        logLevel: LogLevel,
        message: string,
        error?: Error,
        metadata: Record<string, unknown> = {}
    ): void => {
        const _context: LogContext = {
            timestamp: new Date().toISOString(),
            level: logLevel,
            message,
            ...(error && { error }),
            metadata: {
                ...defaultMetadata,
                ...metadata
            }
        };
        // Log implementation here
    };

    return {
        debug: (message: string, metadata?: Record<string, unknown>) => log('DEBUG', message, undefined, metadata),
        info: (message: string, metadata?: Record<string, unknown>) => log('INFO', message, undefined, metadata),
        warn: (message: string, metadata?: Record<string, unknown>) => log('WARN', message, undefined, metadata),
        error: (message: string, error: Error, metadata?: Record<string, unknown>) => log('ERROR', message, error, metadata)
    };
}

// Create and export a default logger instance
export const logger = createLogger({
    level: 'DEBUG',
    metadata: {
        source: 'next-app'
    }
}); 