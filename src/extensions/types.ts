import type { LogLevel } from '../types/enums';

export interface ErrorContext {
    componentName?: string;
    timestamp?: number;
    level?: LogLevel;
    [key: string]: unknown;
}

export interface ErrorMetrics {
    count: number;
    firstSeen: number;
    lastSeen: number;
    contexts: ErrorContext[];
}

export interface RateLimitConfig {
    maxErrors: number;
    timeWindow: number; // in seconds
    cooldown: number; // in seconds
}

export interface ExtensionConfig {
    enabled: boolean;
    debug?: boolean;
    environment?: string;
    rateLimiting?: RateLimitConfig;
}

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
    checkHealth(): Promise<boolean>;

    /**
     * Get current rate limiting status
     */
    getRateLimitStatus(): {
        isThrottled: boolean;
        errorCount: number;
        windowStart: number;
        inCooldown: boolean;
    };

    /**
     * Get error statistics
     */
    getErrorStats(): {
        totalErrors: number;
        uniqueErrors: number;
        oldestError?: number;
        newestError?: number;
    };
} 
