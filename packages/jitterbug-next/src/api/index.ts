import { LogLevel } from '@isarmstrong/jitterbug';
import type { ValidationResult } from '@isarmstrong/jitterbug-core-types';
import type { LogHandler, LogHandlerConfig, LogHandlerResponse } from '@isarmstrong/jitterbug-types';

export type { LogHandler, LogHandlerConfig, LogHandlerResponse };

export interface LogType {
    message: string;
    level: LogLevel;
    timestamp: number;
    [key: string]: unknown;
}

export interface SSETransport {
    handleRequest(req: Request): Promise<Response>;
    write(data: unknown): Promise<void>;
    disconnect(): Promise<ValidationResult>;
}

export interface SSETransportConfig {
    endpoint: string;
    forceVersion?: string;
    heartbeatInterval?: number;
    maxDuration?: number;
    autoReconnect?: boolean;
    signal?: AbortSignal;
}

export function createSSETransport(): SSETransport {
    return {
        handleRequest: async () => new Response(),
        write: async () => { },
        disconnect: async () => ({ isValid: true })
    };
}

/**
 * Creates a Next.js API route handler for Jitterbug logs
 */
export function createHandler(): LogHandler {
    const handler: LogHandlerResponse = {
        async GET(): Promise<Response> {
            return new Response();
        },
        async POST(): Promise<Response> {
            return new Response();
        },
        async HEAD(): Promise<Response> {
            return new Response();
        },
        async OPTIONS(): Promise<Response> {
            return new Response();
        }
    };

    const wrappedHandler = async (req: Request): Promise<Response> => {
        const method = req.method.toUpperCase() as keyof LogHandlerResponse;
        if (method in handler) {
            return handler[method](req);
        }
        return new Response('Method not allowed', { status: 405 });
    };

    return Object.assign(wrappedHandler, handler) as LogHandler;
}

export const createLogHandler = createHandler;

// Set runtime to edge for better performance
export const runtime = 'edge';

// Instead, export any additional helpers as needed
export function apiStub(): string {
    return "apiStub";
}

export default {
    apiStub
};
