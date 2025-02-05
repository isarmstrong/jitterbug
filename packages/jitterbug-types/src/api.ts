import type { LogLevel } from '@isarmstrong/jitterbug-core-types';

export interface LogType {
    message: string;
    level: LogLevel;
    timestamp: string;
    [key: string]: unknown;
}

export interface LogHandlerConfig {
    /** Whether to enable CORS */
    cors?: boolean;
    /** Custom log processor function */
    processLogs?: (logs: LogType[]) => Promise<void> | void;
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