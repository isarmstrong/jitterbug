/**
 * Core type definitions for Jitterbug
 * Edge-first logging with progressive enhancement
 */

/*
 * CORE STABILIZATION:
 * This file is intended to be the single source of truth for core type definitions in the short-term.
 * 
 * [TODO] - Resolve naming conflicts by consolidating duplicate definitions (e.g., LogEntry, LogTransport) found across packages.
 * 
 * NOTE: In future iterations, the canonical core type definitions will be migrated to the
 *       @isarmstrong/jitterbug-core-types package. Meanwhile, please ensure that dependent modules
 *       reference these types consistently to maintain a single source of truth.
 */

/* Constants */
export const LogLevels = Object.freeze({
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
} as const);

export const Runtime = Object.freeze({
    EDGE: 'EDGE',
    NODE: 'NODE',
    BROWSER: 'BROWSER'
} as const);

export const Environment = Object.freeze({
    DEVELOPMENT: 'DEVELOPMENT',
    STAGING: 'STAGING',
    PRODUCTION: 'PRODUCTION',
    TEST: 'TEST'
} as const);

/* Base Types */
export type LogLevel = keyof typeof LogLevels;
export type RuntimeType = keyof typeof Runtime;
export type EnvironmentType = keyof typeof Environment;

/* Core Interfaces */
export interface BaseContext extends Record<string, unknown> {
    timestamp: string;
    runtime: RuntimeType;
    environment: EnvironmentType;
    namespace: string;
}

export interface BaseEntry<T = Record<string, unknown>> {
    level: LogLevel;
    message: string;
    data?: T;
    error?: Error;
    context: BaseContext;
    warnings?: string[];
}

export interface Transport {
    write<T extends Record<string, unknown>>(entry: BaseEntry<T>): Promise<void>;
    connect?(): Promise<void>;
    disconnect?(): void;
}

export interface Processor {
    process<T extends Record<string, unknown>>(entry: BaseEntry<T>): Promise<BaseEntry<T>>;
    supports(runtime: RuntimeType): boolean;
    allowedIn(environment: EnvironmentType): boolean;
}

export interface Config {
    namespace: string;
    enabled?: boolean;
    level?: LogLevel;
    minLevel?: LogLevel;
    runtime?: RuntimeType;
    environment?: EnvironmentType;
    processors?: Processor[];
    transports?: Transport[];
}

export interface Instance {
    debug<T extends Record<string, unknown>>(message: string, data?: T): void;
    info<T extends Record<string, unknown>>(message: string, data?: T): void;
    warn<T extends Record<string, unknown>>(message: string, data?: T): void;
    error(message: string, error: Error, data?: Record<string, unknown>): void;
    fatal(message: string, error: Error, data?: Record<string, unknown>): void;
    setContext(context: Partial<BaseContext>): void;
    getContext(): BaseContext;
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
    configure(config: Partial<Config>): void;
}

export interface Factory {
    create: (config: Config) => Instance;
    createDebug: (namespace: string, config?: Partial<Config>) => Instance;
    getRuntime: () => RuntimeType;
    getEnvironment: () => EnvironmentType;
}

/* Validation Types */
export interface ValidationResult<T = unknown> {
    isValid: boolean;
    errors?: string[];
    value?: T;
}

/* Context Types */
export interface RequestContext {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    requestId?: string;
    duration?: number;
    status?: number;
}

export interface CacheContext {
    operation: "get" | "set" | "delete" | "has" | "clear";
    key: string;
    ttl?: number;
    size?: number;
    hit?: boolean;
    duration?: number;
}

/* Utility Types */
export type ReadonlyEntry = Readonly<BaseEntry>;
export type ReadonlyConfig = Readonly<Config>;
export type RuntimeConfig = Partial<Config>;

/* Type Aliases (Public API) */
export type {
    Config as JitterbugConfig,
    Factory as JitterbugFactory,
    Instance as JitterbugInstance, BaseContext as LogContext, BaseEntry as LogEntry,
    Transport as LogTransport
};

/* Processed Types */
export type ProcessedLogEntry<T = Record<string, unknown>> = Readonly<BaseEntry<T>>;

/* Edge Runtime Types */
export interface EdgeRuntimeConfig extends Config {
    maxMemoryUsage?: number;
    maxProcessingTime?: number;
    cleanupInterval?: number;
}

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