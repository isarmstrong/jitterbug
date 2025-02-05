/**
 * Extended Jitterbug types
 * Edge-first logging with progressive enhancement
 */

import type {
    BaseEntry,
    Config,
    Instance,
    Processor,
    Transport
} from '../core';
import type { ExtendedContext } from './context';

// Enhanced log entry with extended context
export interface ExtendedEntry<T = Record<string, unknown>> extends BaseEntry<T> {
    context: ExtendedContext;
}

// Enhanced processor with extended entry type
export interface ExtendedProcessor extends Processor {
    process<T extends Record<string, unknown>>(entry: ExtendedEntry<T>): Promise<ExtendedEntry<T>>;
}

// Enhanced transport with extended entry type
export interface ExtendedTransport extends Transport {
    write<T extends Record<string, unknown>>(entry: ExtendedEntry<T>): Promise<void>;
}

// Enhanced configuration
export interface ExtendedConfig extends Config {
    processors?: ExtendedProcessor[];
    transports?: ExtendedTransport[];
}

// Enhanced instance
export interface ExtendedInstance extends Instance {
    render<T>(message: string, data?: T): void;
    configure(config: Partial<ExtendedConfig>): void;
    setContext(context: Partial<ExtendedContext>): void;
    getContext(): ExtendedContext;
}

// Utility types
export type ReadonlyExtendedEntry<T = unknown> = Readonly<ExtendedEntry<T>>;
export type ReadonlyExtendedConfig = Readonly<ExtendedConfig>;
export type ExtendedRuntimeConfig = Partial<ExtendedConfig>; 