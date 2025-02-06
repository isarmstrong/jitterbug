export * from './types/api';

export class LogTransport {
    constructor(_options: Record<string, unknown> = {}) { }
}

export class ConsoleTransport {
    constructor(_options: Record<string, unknown> = {}) { }
}

export const LogLevels = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
} as const;

export type Environment = 'node' | 'browser' | 'edge';
export type Runtime = 'node' | 'browser' | 'edge';

export function createJitterbug(_options: Record<string, unknown> = {}): Record<string, unknown> {
    return {};
}

export interface Processor {
    process(entry: LogEntry): Promise<LogEntry>;
}

export interface BaseLogContext {
    context?: Record<string, unknown>;
    message?: string;
    level?: string;
}

export interface RuntimeType {
    type: Runtime;
}

export interface EnvironmentType {
    type: Environment;
}

export interface LogLevel {
    level: keyof typeof LogLevels;
}

export interface LogEntry<TContext = Record<string, unknown>> {
    context?: TContext;
    message?: string;
    level?: keyof typeof LogLevels;
}

export interface ProcessedLogEntry<TContext = Record<string, unknown>> extends LogEntry<TContext> {
    processed: boolean;
}

export const EnvironmentConstants: { DEVELOPMENT: Environment; PRODUCTION: Environment; TEST: Environment } = {
    DEVELOPMENT: 'node',
    PRODUCTION: 'node',
    TEST: 'node'
};

export const RuntimeConstants: { BROWSER: Runtime; EDGE: Runtime; NODE: Runtime } = {
    BROWSER: 'browser',
    EDGE: 'edge',
    NODE: 'node'
};

export const EnvironmentVal = EnvironmentConstants;
export const RuntimeVal = RuntimeConstants;

export const Environment = EnvironmentConstants;
export const Runtime = RuntimeConstants;

export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
} 