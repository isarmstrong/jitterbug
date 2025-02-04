import { LogLevel } from '@jitterbug';

export interface LogType {
    message: string;
    level: LogLevel;
    timestamp: number;
    [key: string]: unknown;
}

export interface LogHandlerConfig {
    /** Whether to enable CORS */
    cors?: boolean;
    /** Custom log processor function */
    processLogs?: (logs: LogType[]) => Promise<void> | void;
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

export interface LogHandlerResponse {
    GET(request: Request): Promise<Response>
    POST(request: Request): Promise<Response>
    HEAD(): Promise<Response>
    OPTIONS(): Promise<Response>
}

export type LogHandler = {
    (req: Request): Promise<Response>
} & LogHandlerResponse

export function createLogHandler(config?: LogHandlerConfig): LogHandler {
    const handler = async (req: Request): Promise<Response> => {
        const method = req.method as keyof LogHandlerResponse;
        if (method in handler) {
            return handler[method](req);
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

    return handler;
}

export const runtime = 'edge'; 