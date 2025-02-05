import type {
    BaseEntry,
    Config,
    Instance,
    LogLevel,
    Processor,
    Transport
} from '../core';
import type { ExtendedContext } from './context';

// Enhanced logger entry with error handling
export interface LogEntry<T = Record<string, unknown>> extends BaseEntry<T> {
    error?: Error;
    warnings?: string[];
    context: ExtendedContext;
}

// Enhanced configuration with logging specifics
export interface LoggerConfig extends Config {
    level?: LogLevel;
    minLevel?: LogLevel;
    processors?: Processor[];
    transports?: Transport[];
}

// Enhanced instance with specific log levels
export interface LoggerInstance extends Instance {
    debug<T>(message: string, data?: T): void;
    info<T>(message: string, data?: T): void;
    warn<T>(message: string, data?: T): void;
    error(message: string, error: Error, data?: Record<string, unknown>): void;
    fatal(message: string, error: Error, data?: Record<string, unknown>): void;
    render<T>(message: string, data?: T): void;
    configure(config: Partial<LoggerConfig>): void;
}

// Utility types
export type ReadonlyLogEntry<T = unknown> = Readonly<LogEntry<T>>;
export type ReadonlyLoggerConfig = Readonly<LoggerConfig>; 