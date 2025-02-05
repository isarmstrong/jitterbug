/**
 * Module declarations for Jitterbug
 * Edge-first logging with progressive enhancement
 */

declare module '@isarmstrong/jitterbug' {
    import type {
        BaseContext,
        BaseEntry,
        Config,
        EnvironmentType,
        Instance,
        LogLevel,
        Processor,
        RuntimeType,
        Transport
    } from './core';

    import type {
        CacheContext,
        ExtendedContext,
        RequestContext
    } from './features/context';

    import type {
        JitterbugConfig,
        JitterbugEntry,
        JitterbugInstance,
        JitterbugProcessor,
        JitterbugTransport
    } from './features/jitterbug';

    // Re-export all types
    export {
        // Core Types
        type BaseContext,
        type BaseEntry, type CacheContext, type Config, type EnvironmentType,

        // Feature Types
        type ExtendedContext, type Instance, type JitterbugConfig,
        // Jitterbug Types
        type JitterbugEntry, type JitterbugInstance,
        type JitterbugProcessor,
        type JitterbugTransport, type LogLevel,
        type Processor, type RequestContext, type RuntimeType, type Transport
    };

    // Export constants
    export const LogLevels: {
        readonly DEBUG: "DEBUG";
        readonly INFO: "INFO";
        readonly WARN: "WARN";
        readonly ERROR: "ERROR";
        readonly FATAL: "FATAL";
    };

    export const Runtime: {
        readonly EDGE: "EDGE";
        readonly NODE: "NODE";
        readonly BROWSER: "BROWSER";
    };

    export const Environment: {
        readonly DEVELOPMENT: "DEVELOPMENT";
        readonly STAGING: "STAGING";
        readonly PRODUCTION: "PRODUCTION";
        readonly TEST: "TEST";
    };

    // Export default factory
    const factory: {
        create: (config: JitterbugConfig) => JitterbugInstance;
        createDebug: (namespace: string, config?: Partial<JitterbugConfig>) => JitterbugInstance;
        getRuntime: () => RuntimeType;
        getEnvironment: () => EnvironmentType;
    };

    export default factory;
}

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

    export interface Processor { }
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