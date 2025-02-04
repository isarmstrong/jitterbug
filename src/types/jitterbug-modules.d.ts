declare module '@jitterbug' {
    export class LogTransport {
        constructor(...args: any[]);
    }
    export class ConsoleTransport {
        constructor(...args: any[]);
    }

    export const LogLevels: any;

    export type NextVersion = any;
    export type Environment = 'node' | 'browser' | 'edge';
    export type Runtime = 'node' | 'browser' | 'edge';

    export function createJitterbug(...args: any[]): any;

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

    export const Environment: { DEVELOPMENT: Environment; PRODUCTION: Environment; TEST: Environment };
    export const Runtime: { BROWSER: Runtime; EDGE: Runtime; NODE: Runtime };

    export interface ValidationResult {
        isValid: boolean;
        errors?: string[];
    }
}

declare module '@jitterbug/transports/edge' {
    export interface EdgeTransportConfig { }
    export class EdgeTransport {
        constructor(config: EdgeTransportConfig);
    }
}

declare module '@jitterbug/transports/console' {
    export class ConsoleTransport {
        constructor(config: any);
    }
} 