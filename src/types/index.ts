/**
 * Type exports for Jitterbug
 * Edge-first logging with progressive enhancement
 */

// Core exports
export {
    Environment,
    LogLevels,
    Runtime,
    // Core Types
    type BaseContext,
    type BaseEntry,
    type Config,
    type EnvironmentType,
    type Factory,
    type Instance, type JitterbugConfig, type JitterbugFactory, type JitterbugInstance,
    // Public API Types
    type LogEntry, type LogLevel, type LogTransport, type Processor,
    type ReadonlyConfig,
    type ReadonlyEntry,
    type RuntimeConfig,
    type RuntimeType,
    type Transport
} from './core';

// Feature exports
export {
    type CacheContext, type ExtendedContext,
    type RequestContext
} from './features/context';

export {
    type ExtendedConfig, type ExtendedEntry, type ExtendedInstance,
    type ExtendedProcessor, type ExtendedRuntimeConfig, type ExtendedTransport, type ReadonlyExtendedConfig, type ReadonlyExtendedEntry
} from './features/jitterbug';

// Add a default export with LogLevels for convenience
export default {
    LogLevels: {
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR',
        FATAL: 'FATAL'
    }
};

