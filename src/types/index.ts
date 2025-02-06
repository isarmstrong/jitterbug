/**
 * Type exports for Jitterbug
 * Edge-first logging with progressive enhancement
 */

// Core exports
export * from './core';

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

