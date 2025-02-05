/**
 * Core type definitions for Jitterbug
 * Edge-first logging with progressive enhancement
 */

// Constants
export const LogLevels = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
} as const;

export const Runtime = {
    EDGE: 'EDGE',
    NODE: 'NODE',
    BROWSER: 'BROWSER'
} as const;

export const Environment = {
    DEVELOPMENT: 'DEVELOPMENT',
    STAGING: 'STAGING',
    PRODUCTION: 'PRODUCTION',
    TEST: 'TEST'
} as const;

// Core Types
export type LogLevel = keyof typeof LogLevels;
export type RuntimeType = keyof typeof Runtime;
export type EnvironmentType = keyof typeof Environment;

// Base Interfaces
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
}

// Public API Types
export type LogEntry<T = Record<string, unknown>> = BaseEntry<T>;
export type LogTransport = Transport;

export interface ValidationResult<T = unknown> {
    isValid: boolean;
    errors?: string[];
    value?: T;
} 