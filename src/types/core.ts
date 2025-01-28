/**
 * Core constants and types for Jitterbug
 */

import { LogLevels, Runtime, Environment } from './enums';
import type { LogLevel, RuntimeType, EnvironmentType } from './enums';

export { LogLevels, Runtime, Environment };
export type { LogLevel, RuntimeType, EnvironmentType };

// Pool A: Core Types
export interface RequestContext {
    id: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
}

export interface CacheContext {
    key: string;
    ttl: number;
    hit: boolean;
    stale: boolean;
}

export interface BaseLogContext {
    timestamp: string;
    runtime: RuntimeType;
    environment: EnvironmentType;
    namespace: string;
    request?: RequestContext;
    cache?: CacheContext;
}

export type LogContext = BaseLogContext & Record<string, unknown>;

export interface LogEntry<T = Record<string, unknown>> {
    level: LogLevel;
    message: string;
    context?: T;
    data?: unknown;
    error?: Error;
    warnings?: string[];
    _metadata?: {
        queueTime: number;
        sequence: number;
        _size: number;
    };
}

export interface ProcessedLogEntry<T = Record<string, unknown>> extends LogEntry<T> {
    processed: true;
}

// Pool C: Implementation Interfaces
export interface LogProcessor {
    process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>>;
    supports?(runtime: RuntimeType): boolean;
    allowedIn?(environment: EnvironmentType): boolean;
}

export interface LogTransport {
    write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;
}

// Pool D: Configuration Types
export interface JitterbugConfig {
    namespace: string;
    environment: EnvironmentType;
    level: LogLevel;
    runtime: RuntimeType;
    enabled?: boolean;
    minLevel?: LogLevel;
    processors?: LogProcessor[];
    transports?: LogTransport[];
    onError?: (error: Error) => void;
    onWarn?: (warning: string) => void;
}

export interface JitterbugInstance {
    debug<T extends Record<string, unknown>>(message: string, data?: T): void;
    info<T extends Record<string, unknown>>(message: string, data?: T): void;
    warn<T extends Record<string, unknown>>(message: string, data?: T): void;
    error(message: string, error: Error, data?: Record<string, unknown>): void;
    fatal(message: string, error: Error, data?: Record<string, unknown>): void;
    render<T extends Record<string, unknown>>(message: string, data?: T): void;
    setContext(context: Partial<LogContext>): void;
    getContext(): LogContext;
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
    configure(config: Partial<JitterbugConfig>): void;
}

export interface JitterbugFactory {
    create: (config: JitterbugConfig) => JitterbugInstance;
    createDebug: (namespace: string, config?: Partial<JitterbugConfig>) => JitterbugInstance;
    getRuntime: () => RuntimeType;
    getEnvironment: () => EnvironmentType;
}

// Type Boundaries
export type CoreLogEntry = Readonly<LogEntry>;
export type TransportLogEntry = LogEntry & { warnings?: string[] };
export type SafeConfig = Readonly<JitterbugConfig>;
export type RuntimeConfig = Partial<JitterbugConfig>;

export interface ErrorHandler {
    wrap<T>(fn: () => Promise<T>): Promise<T>;
} 