import type { ValidationResult } from '@isarmstrong/jitterbug';
import type { LogType, SSETransportConfig } from '../../types';

export abstract class BaseSSETransport {
    protected config: SSETransportConfig;
    protected isConnected: boolean = false;

    constructor(config: SSETransportConfig) {
        this.config = {
            ...config,
            heartbeatInterval: config.heartbeatInterval || 30000,
            retryInterval: config.retryInterval || 1000,
            maxDuration: config.maxDuration || 25000,
            autoReconnect: config.autoReconnect ?? true
        };
    }

    /**
     * Handle an incoming SSE request
     * @param req The incoming request
     */
    abstract handleRequest(req: Request): Promise<Response>;

    /**
     * Write data to the SSE stream
     * @param data The data to write
     */
    abstract write(data: LogType): Promise<void>;

    /**
     * Connect to the SSE stream
     * This is called automatically by handleRequest
     */
    abstract connect(): Promise<ValidationResult>;

    /**
     * Disconnect from the SSE stream
     * This is called automatically when the stream ends
     */
    abstract disconnect(): Promise<ValidationResult>;

    /**
     * Check if the transport is connected
     */
    isActive(): boolean {
        return this.isConnected;
    }

    /**
     * Get the current transport configuration
     */
    getConfig(): SSETransportConfig {
        return { ...this.config };
    }

    protected validateRequest(req: Request): ValidationResult {
        const accept = req.headers.get('accept') || '';
        const isValid = accept.includes('text/event-stream');

        return {
            isValid,
            errors: isValid ? undefined : ['Unsupported media type: Expected text/event-stream']
        };
    }

    protected getSSEHeaders(): HeadersInit {
        return {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        };
    }

    protected createErrorResponse(status: number, message: string): Response {
        return new Response(message, { status });
    }
} 