import { BaseErrorReportingExtension } from '../base';
import type { ErrorContext, ExtensionConfig, ExtensionHealth } from '../../types/extension';
import { createDebug } from '../../core';

const debug = createDebug('extensions:vercel');

export interface VercelConfig extends ExtensionConfig {
    readonly token?: string;
    readonly projectId?: string;
}

export class VercelExtension extends BaseErrorReportingExtension {
    private token?: string;
    private projectId?: string;
    private isVercelEnvironment: boolean;

    constructor() {
        super();
        this.isVercelEnvironment = typeof process.env.VERCEL === 'string' && process.env.VERCEL !== '' ||
            typeof process.env.VERCEL_ENV === 'string' && process.env.VERCEL_ENV !== '' ||
            typeof process.env.NOW_DEPLOY_URL === 'string' && process.env.NOW_DEPLOY_URL !== '';
    }

    async init(config: VercelConfig): Promise<void> {
        if (this.initialized) {
            debug.warn('Vercel extension already initialized');
            return;
        }

        // Ensure required config fields are present
        const vercelConfig: ExtensionConfig = {
            enabled: config.enabled,
            debug: config.debug ?? false,
            environment: config.environment
        };
        this.config = vercelConfig;

        const envToken = process.env.VERCEL_API_TOKEN;
        const envProjectId = process.env.VERCEL_PROJECT_ID;

        // Validate and set token
        this.token = typeof config.token === 'string' && config.token !== ''
            ? config.token
            : (typeof envToken === 'string' && envToken !== '' ? envToken : undefined);

        // Validate and set project ID
        this.projectId = typeof config.projectId === 'string' && config.projectId !== ''
            ? config.projectId
            : (typeof envProjectId === 'string' && envProjectId !== '' ? envProjectId : undefined);

        // Configure rate limits if provided
        if (config.rateLimiting !== undefined) {
            this.maxErrors = config.rateLimiting.maxErrors;
            this.timeWindow = config.rateLimiting.timeWindow;
            this.cooldown = config.rateLimiting.cooldown;
        }

        if (!this.isVercelEnvironment) {
            debug.warn('Not running in a Vercel environment');
            return;
        }

        if (typeof this.token !== 'string' || this.token === '' || typeof this.projectId !== 'string' || this.projectId === '') {
            debug.warn('Missing Vercel credentials, will only log locally');
            return;
        }

        // Validate credentials with a test API call
        try {
            const response = await fetch(`https://api.vercel.com/v1/projects/${this.projectId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                debug.warn('Failed to validate Vercel credentials');
                return;
            }

            this.initialized = true;
            debug.info('Vercel extension initialized');
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to validate Vercel credentials');
            debug.warn('Failed to validate Vercel credentials', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
    }

    async reportError(error: Error, context?: ErrorContext): Promise<void> {
        if (!this.initialized || !this.isVercelEnvironment) {
            debug.warn('Vercel extension not initialized');
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

            // Only send to Vercel on significant count changes
            if (updatedOccurrence.count === 10 || updatedOccurrence.count === 100 || updatedOccurrence.count === 1000) {
                await this.sendToVercel(error, {
                    ...context,
                    occurrenceCount: updatedOccurrence.count,
                    firstSeen: new Date(updatedOccurrence.firstSeen).toISOString(),
                    timespan: Date.now() - updatedOccurrence.firstSeen,
                    contexts: updatedOccurrence.contexts
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
            await this.sendToVercel(error, context);
        }
    }

    private async sendToVercel(error: Error, context?: Record<string, unknown>): Promise<void> {
        if (typeof this.token !== 'string' || this.token === '' || typeof this.projectId !== 'string' || this.projectId === '') {
            return;
        }

        try {
            const response = await fetch(`https://api.vercel.com/v1/projects/${this.projectId}/errors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    context: {
                        ...context,
                        environment: this.config.environment,
                        componentName: typeof context?.componentName === 'string' && context.componentName !== ''
                            ? context.componentName
                            : 'unknown'
                    }
                })
            });

            if (response.ok !== true) {
                const errorData = await response.json() as { error?: { message?: string } };
                const apiError = new Error(
                    typeof errorData.error?.message === 'string' && errorData.error.message !== ''
                        ? errorData.error.message
                        : 'Unknown Vercel API error'
                );
                debug.error('Failed to send error to Vercel', {
                    name: apiError.name,
                    message: apiError.message,
                    stack: apiError.stack
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error sending to Vercel');
            debug.error('Failed to send error to Vercel', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
    }

    async checkHealth(): Promise<ExtensionHealth> {
        if (!this.initialized || !this.isVercelEnvironment) {
            return {
                isHealthy: false,
                lastCheck: Date.now(),
                error: new Error('Vercel extension not initialized')
            };
        }

        if (typeof this.token !== 'string' || this.token === '' || typeof this.projectId !== 'string' || this.projectId === '') {
            return {
                isHealthy: false,
                lastCheck: Date.now(),
                error: new Error('Missing Vercel credentials')
            };
        }

        try {
            const response = await fetch(`https://api.vercel.com/v1/projects/${this.projectId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return {
                isHealthy: response.ok === true,
                lastCheck: Date.now(),
                error: response.ok === true ? undefined : new Error(`Vercel API returned ${response.status}`)
            };
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Health check failed');
            debug.error('Health check failed', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            return {
                isHealthy: false,
                lastCheck: Date.now(),
                error
            };
        }
    }
} 
