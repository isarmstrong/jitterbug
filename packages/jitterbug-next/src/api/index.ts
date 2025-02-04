import { LogLevel } from '@isarmstrong/jitterbug';
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
    disconnect(): Promise<void>;
}

export interface SSETransportConfig {
    endpoint: string;
    forceVersion?: string;
    heartbeatInterval?: number;
    maxDuration?: number;
}

export function createSSETransport(config: SSETransportConfig): SSETransport {
    return {
        handleRequest: async (req: Request) => new Response(),
        write: async (data: unknown) => { },
        disconnect: async () => { }
    };
}

/**
 * Creates a Next.js API route handler for Jitterbug logs
 */
export function createHandler(config?: LogHandlerConfig): LogHandler {
    const handler = async (req: Request): Promise<Response> => {
        const method = req.method.toUpperCase() as keyof LogHandlerResponse;
        if (method in handler && typeof (handler as any)[method] === 'function') {
            return (handler as any)[method](req);
        }
        return new Response('Method not allowed', { status: 405 });
    };

    handler.GET = async (request: Request): Promise<Response> => {
        return new Response();
    };

    handler.POST = async (request: Request): Promise<Response> => {
        return new Response();
    };

    handler.HEAD = async (): Promise<Response> => {
        return new Response();
    };

    handler.OPTIONS = async (): Promise<Response> => {
        return new Response();
    };

    return handler as unknown as LogHandler;
}

export const createLogHandler = createHandler;

// Set runtime to edge for better performance
export const runtime = 'edge';

// Instead, export any additional helpers as needed
export function apiStub() {
    return "apiStub";
}

export default {
    apiStub
};
