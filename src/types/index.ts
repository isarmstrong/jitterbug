export * from './core';

// Internal types (full type information)
export type LogLevel = 'info' | 'warn' | 'error';

export interface BaseLog {
    timestamp: string;
    level: LogLevel;
    message: string;
}

export interface InfoLog extends BaseLog {
    level: 'info';
    data?: unknown;
}

export interface WarnLog extends BaseLog {
    level: 'warn';
    data?: unknown;
}

export interface ErrorLog extends BaseLog {
    level: 'error';
    error: Error;
    stack?: string;
}

// Wire types (serialization-safe)
export interface SerializedErrorLog extends Omit<ErrorLog, 'error'> {
    level: 'error';
    errorMessage: string;
    errorName: string;
    errorStack?: string;
}

export type SerializedLogType = InfoLog | WarnLog | SerializedErrorLog;

// Type guards for runtime validation
export const isSerializedErrorLog = (log: SerializedLogType): log is SerializedErrorLog =>
    log.level === 'error' && 'errorMessage' in log;

// Connection states (shared between client/server)
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed';

// Re-export core types to maintain single source of truth
export type { EdgeBoundaryLayer } from './ebl/core';

// Add back the LogType export that was accidentally removed
export type LogType = InfoLog | WarnLog | ErrorLog;
