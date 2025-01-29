import type { ErrorReportingExtension, ExtensionConfig, ErrorContext, ExtensionHealth } from '../types/extension';
import { isError, isErrorContext } from '../types/extension';
import { SentryExtension } from './sentry';
import type { SentryConfig } from './sentry/types';
import { VercelExtension } from './vercel';
import type { VercelConfig } from './vercel';
import { createDebug } from '../core';

const debug = createDebug('extensions:factory');

export type ExtensionType = 'sentry' | 'vercel';

class ExtensionProxy implements ErrorReportingExtension {
    constructor(
        private readonly primaryExtension: ErrorReportingExtension,
        private readonly fallbackExtension?: ErrorReportingExtension
    ) { }

    async init(config: ExtensionConfig): Promise<void> {
        await this.primaryExtension.init(config);
        if (this.fallbackExtension !== undefined) {
            await this.fallbackExtension.init(config);
        }
    }

    async reportError(error: Error, context?: ErrorContext): Promise<void> {
        if (!isError(error)) {
            throw new Error('Invalid error object provided');
        }
        if (context !== undefined && !isErrorContext(context)) {
            throw new Error('Invalid error context provided');
        }

        try {
            await this.primaryExtension.reportError(error, context);
        } catch (err) {
            const primaryError = err instanceof Error ? err : new Error('Primary extension failed');
            const errorContext = {
                name: primaryError.name,
                message: primaryError.message,
                stack: primaryError.stack,
                ...(context ?? {})
            };
            debug.warn('Primary extension failed', errorContext);

            const status = this.primaryExtension.getRateLimitStatus();
            if (status.isThrottled === true && this.fallbackExtension !== undefined) {
                debug.info('Primary extension throttled, using fallback');
                try {
                    await this.fallbackExtension.reportError(error, context);
                } catch (err) {
                    const fallbackError = err instanceof Error ? err : new Error('Fallback extension failed');
                    const fallbackContext = {
                        name: fallbackError.name,
                        message: fallbackError.message,
                        stack: fallbackError.stack,
                        ...(context ?? {})
                    };
                    debug.error('Fallback extension failed', fallbackContext);
                }
            }
        }
    }

    async checkHealth(): Promise<ExtensionHealth> {
        const primaryHealth = await this.primaryExtension.checkHealth();
        const fallbackHealth = this.fallbackExtension !== undefined
            ? await this.fallbackExtension.checkHealth()
            : undefined;

        return {
            isHealthy: primaryHealth.isHealthy === true || Boolean(fallbackHealth?.isHealthy),
            lastCheck: Date.now(),
            error: primaryHealth.isHealthy === true ? undefined : primaryHealth.error
        };
    }

    getRateLimitStatus(): ReturnType<ErrorReportingExtension['getRateLimitStatus']> {
        return this.primaryExtension.getRateLimitStatus();
    }

    getErrorStats(): ReturnType<ErrorReportingExtension['getErrorStats']> {
        return this.primaryExtension.getErrorStats();
    }
}

export class ErrorReportingFactory {
    private static instance: ErrorReportingFactory;
    private readonly extensions: Map<string, ErrorReportingExtension>;
    private primaryExtension?: ErrorReportingExtension;
    private fallbackExtension?: ErrorReportingExtension;

    private constructor() {
        this.extensions = new Map<string, ErrorReportingExtension>();
        debug.info('ErrorReportingFactory created');
    }

    static getInstance(): ErrorReportingFactory {
        if (ErrorReportingFactory.instance === undefined) {
            ErrorReportingFactory.instance = new ErrorReportingFactory();
        }
        return ErrorReportingFactory.instance;
    }

    getExtension(type: ExtensionType): ErrorReportingExtension | undefined {
        return this.extensions.get(type);
    }

    createExtension(type: ExtensionType): ErrorReportingExtension {
        const extension = this.extensions.get(type);
        if (extension !== undefined) {
            return extension;
        }

        let newExtension: ErrorReportingExtension;
        switch (type) {
            case 'sentry':
                newExtension = new SentryExtension();
                break;
            case 'vercel':
                newExtension = new VercelExtension();
                break;
            default: {
                const exhaustiveCheck: never = type;
                throw new Error(`Unknown extension type: ${String(exhaustiveCheck)}`);
            }
        }

        this.extensions.set(type, newExtension);
        return newExtension;
    }

    /**
     * Auto-detect and create the most appropriate extension for the environment.
     * If both Sentry and Vercel are available, Sentry will be primary with Vercel as fallback.
     */
    async autoDetectExtension(): Promise<ErrorReportingExtension | undefined> {
        const isVercelEnv = typeof process.env.VERCEL === 'string' && process.env.VERCEL !== '' ||
            typeof process.env.VERCEL_ENV === 'string' && process.env.VERCEL_ENV !== '';
        const hasSentryConfig = typeof process.env.NEXT_PUBLIC_SENTRY_DSN === 'string' && process.env.NEXT_PUBLIC_SENTRY_DSN !== '';

        if (hasSentryConfig === true) {
            debug.info('Detected Sentry configuration - setting as primary');
            const sentry = this.createExtension('sentry');
            const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
            if (typeof dsn !== 'string' || dsn === '') {
                throw new Error('Sentry DSN is required but was empty or invalid');
            }

            await sentry.init({
                enabled: true,
                debug: false,
                environment: typeof process.env.NODE_ENV === 'string' && process.env.NODE_ENV !== ''
                    ? process.env.NODE_ENV
                    : 'development',
                dsn
            } as SentryConfig);

            const health = await sentry.checkHealth();
            if (health.isHealthy === true) {
                this.primaryExtension = sentry;
            } else {
                debug.warn('Sentry health check failed', {
                    name: health.error?.name,
                    message: health.error?.message,
                    stack: health.error?.stack
                });
            }
        }

        if (isVercelEnv === true) {
            debug.info('Detected Vercel environment');
            const vercel = this.createExtension('vercel');
            await vercel.init({
                enabled: true,
                debug: false,
                environment: typeof process.env.VERCEL_ENV === 'string' && process.env.VERCEL_ENV !== ''
                    ? process.env.VERCEL_ENV
                    : 'production'
            } as VercelConfig);

            const health = await vercel.checkHealth();
            if (this.primaryExtension === undefined && health.isHealthy === true) {
                debug.info('Setting Vercel as primary extension');
                this.primaryExtension = vercel;
            } else if (this.primaryExtension !== undefined && health.isHealthy === true) {
                debug.info('Setting Vercel as fallback extension');
                this.fallbackExtension = vercel;
            }
        }

        if (this.primaryExtension === undefined) {
            debug.warn('No error reporting service detected, errors will only be logged locally');
            return undefined;
        }

        return new ExtensionProxy(this.primaryExtension, this.fallbackExtension);
    }

    removeExtension(type: ExtensionType): void {
        const extension = this.extensions.get(type);
        if (extension === this.primaryExtension) {
            this.primaryExtension = undefined;
        }
        if (extension === this.fallbackExtension) {
            this.fallbackExtension = undefined;
        }
        this.extensions.delete(type);
    }

    getAllExtensions(): ReadonlyMap<string, ErrorReportingExtension> {
        return new Map(this.extensions);
    }
} 
