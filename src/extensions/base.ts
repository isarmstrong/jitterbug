import { createDebug } from '../core';
import type {
    ErrorContext,
    ErrorMetrics,
    ExtensionConfig,
    ErrorReportingExtension,
    RateLimitStatus,
    ErrorStats,
    ExtensionHealth
} from '../types/extension';

const debug = createDebug('extensions:base');

export abstract class BaseErrorReportingExtension implements ErrorReportingExtension {
    protected initialized = false;
    protected errorMap = new Map<string, ErrorMetrics>();
    protected errorCount = 0;
    protected windowStart = Date.now();
    protected inCooldown = false;
    protected config: ExtensionConfig;

    // Default rate limits
    protected maxErrors = 100; // Max errors per window
    protected timeWindow = 60; // 1 minute window
    protected cooldown = 300; // 5 minute cooldown

    constructor() {
        this.config = {
            enabled: false,
            debug: false,
            environment: 'development'
        };
        // Clean error map periodically
        setInterval(() => this.cleanErrorMap(), 60000); // Every minute
    }

    abstract init(config: ExtensionConfig): Promise<void>;
    abstract reportError(error: Error, context?: ErrorContext): Promise<void>;
    abstract checkHealth(): Promise<ExtensionHealth>;

    protected shouldThrottle(): boolean {
        const now = Date.now();

        // Reset window if needed
        if (now - this.windowStart > this.timeWindow * 1000) {
            this.errorCount = 0;
            this.windowStart = now;
            this.inCooldown = false;
        }

        // Check if in cooldown
        if (this.inCooldown) {
            return true;
        }

        // Check rate limit
        if (this.errorCount >= this.maxErrors) {
            debug.warn('error-rate-limit-exceeded', {
                count: this.errorCount,
                window: this.timeWindow
            });
            this.inCooldown = true;
            setTimeout(() => {
                this.inCooldown = false;
                this.errorCount = 0;
            }, this.cooldown * 1000);
            return true;
        }

        return false;
    }

    protected cleanErrorMap(): void {
        const now = Date.now();
        const expiryTime = 3600000; // 1 hour

        Array.from(this.errorMap.entries()).forEach(([key, occurrence]) => {
            if (now - occurrence.lastSeen > expiryTime) {
                this.errorMap.delete(key);
            }
        });
    }

    protected getErrorFingerprint(error: Error, context?: ErrorContext): string {
        const fingerprint = {
            message: error.message,
            type: error.name,
            componentName: context?.componentName
        };
        return JSON.stringify(fingerprint);
    }

    getRateLimitStatus(): RateLimitStatus {
        return {
            isThrottled: this.inCooldown,
            errorCount: this.errorCount,
            windowStart: this.windowStart,
            inCooldown: this.inCooldown
        };
    }

    getErrorStats(): ErrorStats {
        const errors = Array.from(this.errorMap.values());
        return {
            totalErrors: errors.reduce((sum, err) => sum + err.count, 0),
            uniqueErrors: this.errorMap.size,
            oldestError: errors.length ? Math.min(...errors.map(e => e.firstSeen)) : undefined,
            newestError: errors.length ? Math.max(...errors.map(e => e.lastSeen)) : undefined
        };
    }
} 
