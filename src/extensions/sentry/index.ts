import { BaseErrorReportingExtension } from '../base';
import type { ErrorContext, ExtensionHealth } from '../../types/extension';
import { createDebug } from '../../core';
import { tryImportModules } from '../../utils/dynamic-import';
import type { SentryClient, SentryConfig, SentryEvent } from './types';
import { isSentryConfig, isSentryEvent } from './types';

const debug = createDebug('extensions:sentry');

const SENTRY_MODULES = ['@sentry/nextjs', '@sentry/node'] as const;

export class SentryExtension extends BaseErrorReportingExtension {
    private dsn?: string;
    private Sentry?: SentryClient;

    async init(config: SentryConfig): Promise<void> {
        if (this.initialized) {
            debug.warn('Sentry already initialized');
            return;
        }

        if (!isSentryConfig(config)) {
            throw new Error('Invalid Sentry configuration');
        }

        this.config = config;
        this.dsn = config.dsn;

        // Configure rate limits if provided
        if (config.rateLimiting) {
            this.maxErrors = config.rateLimiting.maxErrors;
            this.timeWindow = config.rateLimiting.timeWindow;
            this.cooldown = config.rateLimiting.cooldown;
        }

        try {
            // Try to import Sentry from available modules
            const sentryModule = await tryImportModules<SentryClient>(
                SENTRY_MODULES,
                'Failed to import Sentry. Make sure either @sentry/nextjs or @sentry/node is installed in your application.'
            );

            this.Sentry = sentryModule;

            this.Sentry.init({
                dsn: this.dsn,
                environment: config.environment,
                enabled: config.enabled && config.environment === 'production',
                tracesSampleRate: config.tracesSampleRate ?? 1.0,
                debug: config.debug ?? false,
                autoSessionTracking: config.autoSessionTracking ?? true,
                beforeSend: (event: unknown): SentryEvent | null => {
                    if (!config.enabled || config.environment !== 'production') {
                        return null;
                    }

                    if (!isSentryEvent(event)) {
                        debug.warn('Invalid Sentry event', { event });
                        return null;
                    }

                    // Add deduplication fingerprint
                    if (event.exception?.values?.[0] !== undefined) {
                        const exception = event.exception.values[0];
                        const componentName = event.extra?.componentName;
                        event.fingerprint = [
                            exception.type ?? 'Error',
                            exception.value ?? 'Unknown',
                            String(typeof componentName === 'string' && componentName !== '' ? componentName : 'unknown_component')
                        ];
                    }

                    return event;
                },
            });

            this.initialized = true;
            debug.info('Sentry initialized');
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to initialize Sentry');
            debug.error('Failed to initialize Sentry', error);
            throw error;
        }
    }

    async reportError(error: Error, context?: ErrorContext): Promise<void> {
        if (!this.initialized || !this.Sentry) {
            debug.warn('Sentry not initialized');
            return;
        }

        // Always log through Jitterbug
        debug.error(error.message, error, context);

        if (!this.config.enabled || this.config.environment !== 'production') {
            return;
        }

        // Check rate limiting
        if (this.shouldThrottle()) {
            debug.warn('error-throttled', { message: error.message });
            return;
        }

        // Update error tracking
        this.errorCount++;
        const fingerprint = this.getErrorFingerprint(error, context);
        const occurrence = this.errorMap.get(fingerprint);

        if (occurrence) {
            // Update existing occurrence immutably
            const updatedOccurrence = {
                ...occurrence,
                count: occurrence.count + 1,
                lastSeen: Date.now(),
                contexts: [...occurrence.contexts, context || {}]
            };
            this.errorMap.set(fingerprint, updatedOccurrence);

            // Only send to Sentry on significant count changes
            if (updatedOccurrence.count === 10 || updatedOccurrence.count === 100 || updatedOccurrence.count === 1000) {
                await this.Sentry.captureException(error, {
                    extra: {
                        ...context,
                        occurrenceCount: updatedOccurrence.count,
                        firstSeen: new Date(updatedOccurrence.firstSeen).toISOString(),
                        timespan: Date.now() - updatedOccurrence.firstSeen,
                        contexts: updatedOccurrence.contexts
                    }
                });
            }
        } else {
            // Create new occurrence
            this.errorMap.set(fingerprint, {
                count: 1,
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                contexts: [context || {}]
            });
            await this.Sentry.captureException(error, { extra: context });
        }
    }

    async checkHealth(): Promise<ExtensionHealth> {
        if (!this.initialized || !this.Sentry) {
            return {
                isHealthy: false,
                lastCheck: Date.now(),
                error: new Error('Sentry not initialized')
            };
        }

        try {
            // Send a test error
            const testError = new Error('Health check');
            await this.Sentry.captureException(testError);

            return {
                isHealthy: true,
                lastCheck: Date.now()
            };
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Health check failed');
            debug.error('Health check failed', error);

            return {
                isHealthy: false,
                lastCheck: Date.now(),
                error
            };
        }
    }
} 
