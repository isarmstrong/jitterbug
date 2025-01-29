import type { LogLevel } from './enums';

/**
 * Core extension types for Jitterbug's extension system.
 * These types enforce strict type safety and null checking across all extensions.
 */

/**
 * Represents a dynamic module import result
 * Used to safely type-check dynamic imports without requiring the actual types
 */
export type DynamicModule<T> = Promise<{
    [K in keyof T]: T[K];
}>;

/**
 * Extension environment configuration
 */
export interface ExtensionEnvironment {
    readonly name: string;
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isTest: boolean;
}

/**
 * Rate limiting configuration for extensions
 */
export interface RateLimitConfig {
    readonly maxErrors: number;
    readonly timeWindow: number; // in seconds
    readonly cooldown: number; // in seconds
}

/**
 * Base configuration for all extensions
 */
export interface ExtensionConfig {
    readonly enabled: boolean;
    readonly debug: boolean;
    readonly environment: string;
    readonly rateLimiting?: RateLimitConfig;
}

/**
 * Context for error reporting
 */
export interface ErrorContext {
    readonly componentName?: string;
    readonly timestamp?: number;
    readonly level?: LogLevel;
    readonly [key: string]: unknown;
}

/**
 * Error metrics for tracking occurrences
 */
export interface ErrorMetrics {
    readonly count: number;
    readonly firstSeen: number;
    readonly lastSeen: number;
    readonly contexts: ReadonlyArray<ErrorContext>;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
    readonly isThrottled: boolean;
    readonly errorCount: number;
    readonly windowStart: number;
    readonly inCooldown: boolean;
}

/**
 * Error statistics
 */
export interface ErrorStats {
    readonly totalErrors: number;
    readonly uniqueErrors: number;
    readonly oldestError?: number;
    readonly newestError?: number;
}

/**
 * Extension health status
 */
export interface ExtensionHealth {
    readonly isHealthy: boolean;
    readonly lastCheck: number;
    readonly error?: Error;
}

/**
 * Base interface for all error reporting extensions
 */
export interface ErrorReportingExtension {
    /**
     * Initialize the extension with configuration
     */
    init(config: ExtensionConfig): Promise<void>;

    /**
     * Report an error with optional context
     */
    reportError(error: Error, context?: ErrorContext): Promise<void>;

    /**
     * Check if the extension is healthy and properly configured
     */
    checkHealth(): Promise<ExtensionHealth>;

    /**
     * Get current rate limiting status
     */
    getRateLimitStatus(): RateLimitStatus;

    /**
     * Get error statistics
     */
    getErrorStats(): ErrorStats;
}

/**
 * Type guard for checking if a value is an Error
 */
export function isError(value: unknown): value is Error {
    if (value === null || value === undefined || typeof value !== 'object') return false;
    return value instanceof Error;
}

/**
 * Type guard for checking if a value is a valid ErrorContext
 */
export function isErrorContext(value: unknown): value is ErrorContext {
    if (value === null || value === undefined || typeof value !== 'object') return false;

    const context = value as Record<string, unknown>;
    return Object.entries(context).every(([key, val]) =>
        typeof key === 'string' &&
        (val === null || val === undefined || ['string', 'number', 'boolean'].includes(typeof val))
    );
}

/**
 * Type guard for checking if a value is a valid ExtensionConfig
 */
export function isExtensionConfig(value: unknown): value is ExtensionConfig {
    if (value === null || value === undefined || typeof value !== 'object') return false;

    const config = value as Record<string, unknown>;
    if (typeof config.enabled !== 'boolean') return false;
    if (typeof config.debug !== 'boolean') return false;
    if (typeof config.environment !== 'string' || config.environment === '') return false;

    if (config.rateLimiting !== undefined) {
        if (typeof config.rateLimiting !== 'object' || config.rateLimiting === null) return false;
        const rateLimiting = config.rateLimiting as Record<string, unknown>;

        if (typeof rateLimiting.maxErrors !== 'number' || !Number.isFinite(rateLimiting.maxErrors)) return false;
        if (typeof rateLimiting.timeWindow !== 'number' || !Number.isFinite(rateLimiting.timeWindow)) return false;
        if (typeof rateLimiting.cooldown !== 'number' || !Number.isFinite(rateLimiting.cooldown)) return false;
    }

    return true;
} 
