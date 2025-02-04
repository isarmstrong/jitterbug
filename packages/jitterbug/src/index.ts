export * from './types/api';

export class LogTransport {
    constructor(...args: any[]) { }
}

export class ConsoleTransport {
    constructor(...args: any[]) { }
}

export const LogLevels = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};

export type Environment = 'node' | 'browser' | 'edge';
export type Runtime = 'node' | 'browser' | 'edge';

export function createJitterbug(...args: any[]): any {
    return {};
}

export interface LogProcessor { }

export interface BaseLogContext {
    context?: any;
    message?: string;
    level?: any;
}

export interface RuntimeType { }
export interface EnvironmentType { }
export interface LogLevel { }
export interface LogEntry<T = any> {
    context?: any;
    message?: string;
    level?: any;
}
export interface ProcessedLogEntry<T = any> { }

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