import type { ExtensionConfig } from '../../types/extension';

/**
 * Sentry-specific configuration
 */
export interface SentryConfig extends ExtensionConfig {
    readonly dsn: string;
    readonly tracesSampleRate?: number;
    readonly autoSessionTracking?: boolean;
}

/**
 * Minimal type definition for Sentry events
 */
export interface SentryEvent {
    readonly exception?: {
        readonly values?: ReadonlyArray<{
            readonly type?: string;
            readonly value?: string;
        }>;
    };
    readonly extra?: Readonly<Record<string, unknown>>;
    fingerprint?: ReadonlyArray<string>;
}

/**
 * Minimal type definition for Sentry client
 */
export interface SentryClient {
    init(options: Readonly<Record<string, unknown>>): void;
    captureException(error: Error, options?: { readonly extra?: Readonly<Record<string, unknown>> }): Promise<void>;
}

/**
 * Type guard for checking if a value is a valid SentryConfig
 */
export function isSentryConfig(value: unknown): value is SentryConfig {
    if (value === null || value === undefined || typeof value !== 'object') return false;

    const config = value as Record<string, unknown>;
    if (typeof config.dsn !== 'string' || config.dsn === '') return false;

    if (config.tracesSampleRate !== undefined && typeof config.tracesSampleRate !== 'number') return false;
    if (config.autoSessionTracking !== undefined && typeof config.autoSessionTracking !== 'boolean') return false;

    return true;
}

/**
 * Type guard for checking if a value is a valid SentryEvent
 */
export function isSentryEvent(value: unknown): value is SentryEvent {
    if (value === null || value === undefined || typeof value !== 'object') return false;

    const event = value as Record<string, unknown>;

    if (event.exception !== undefined) {
        if (typeof event.exception !== 'object' || event.exception === null) return false;
        const exception = event.exception as Record<string, unknown>;

        if (exception.values !== undefined) {
            if (!Array.isArray(exception.values)) return false;
            for (const exValue of exception.values) {
                if (typeof exValue !== 'object' || exValue === null) return false;
                const value = exValue as Record<string, unknown>;
                if (value.type !== undefined && typeof value.type !== 'string') return false;
                if (value.value !== undefined && typeof value.value !== 'string') return false;
            }
        }
    }

    if (event.extra !== undefined && (typeof event.extra !== 'object' || event.extra === null || Array.isArray(event.extra))) {
        return false;
    }

    if (event.fingerprint !== undefined) {
        if (!Array.isArray(event.fingerprint)) return false;
        if (!event.fingerprint.every(item => typeof item === 'string')) return false;
    }

    return true;
}

// Re-export everything from index
export * from './types'; 
