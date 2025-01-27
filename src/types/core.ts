/**
 * Core constants and types for Jitterbug
 */

// Pool A: Core Constants
export const LogLevels = Object.freeze({
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    FATAL: "FATAL",
} as const);

export const Runtime = Object.freeze({
    EDGE: "EDGE",
    NODE: "NODE",
    BROWSER: "BROWSER",
} as const);

export const Environment = Object.freeze({
    DEVELOPMENT: "DEVELOPMENT",
    STAGING: "STAGING",
    PRODUCTION: "PRODUCTION",
    TEST: "TEST",
} as const);

// Pool B: Core Types
export type LogLevel = keyof typeof LogLevels | Lowercase<keyof typeof LogLevels>;
export type RuntimeType = keyof typeof Runtime;
export type EnvironmentType = keyof typeof Environment;

// Pool B: Core Interfaces
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

export interface LogContext {
    timestamp: string;
    runtime: RuntimeType;
    environment: EnvironmentType;
    namespace: string;
    request?: RequestContext;
    cache?: CacheContext;
    [key: string]: unknown;
}

export interface LogEntry<T = Record<string, unknown>> {
    level: LogLevel;
    message: string;
    data?: T;
    error?: Error;
    context: LogContext;
    warnings?: string[];
}

// Pool C: Implementation Interfaces
export interface LogProcessor {
    process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>>;
    supports(runtime: RuntimeType): boolean;
    allowedIn(environment: EnvironmentType): boolean;
}

export interface LogTransport {
    write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;
}

// Pool D: Configuration Types
export interface JitterbugConfig {
    namespace: string;
    enabled?: boolean;
    level?: LogLevel;
    minLevel?: LogLevel;
    runtime?: RuntimeType;
    environment?: EnvironmentType;
    processors?: LogProcessor[];
    transports?: LogTransport[];
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