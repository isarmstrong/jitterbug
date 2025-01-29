import type { LogEntry } from "../types/core";
import { AsyncBaseTransport } from "./async-base";
import { isNonEmptyString } from "../types/guards";

/**
 * Configuration for the GUI transport
 */
export interface GUITransportConfig {
    readonly maxEntries?: number;
    readonly defaultFilters?: Readonly<Record<string, boolean>>;
    readonly namespace?: string;
}

/**
 * Type-safe filter configuration
 */
export interface FilterConfig {
    readonly namespace: string;
    readonly enabled: boolean;
}

/**
 * Immutable GUI transport state
 */
export interface GUITransportState {
    readonly entries: ReadonlyArray<LogEntry<Record<string, unknown>>>;
    readonly filters: Readonly<Record<string, boolean>>;
}

/**
 * Type-safe callback for state updates
 */
export type StateUpdateCallback = (state: Readonly<GUITransportState>) => void;

/**
 * GUI Transport for managing log entries with proper type safety and immutability
 */
export class GUITransport extends AsyncBaseTransport {
    private readonly maxEntries: number;
    private entries: Array<LogEntry<Record<string, unknown>>>;
    private filters: Record<string, boolean>;
    private readonly callbacks: Set<StateUpdateCallback>;

    constructor(config: Readonly<GUITransportConfig> = {}) {
        super();
        this.maxEntries = config.maxEntries ?? 1000;
        this.entries = [];
        this.filters = { ...(config.defaultFilters ?? {}) };
        this.callbacks = new Set();
    }

    /**
     * Writes a log entry to the transport with type safety.
     * This method maintains an async signature for consistency with the AsyncBaseTransport interface,
     * but performs synchronous state updates internally for performance.
     * 
     * Design Pattern: "Async Contract Preservation" with "Safe State Updates"
     * - Maintains interface consistency across transports
     * - Ensures atomic state updates
     * - Provides immutable state snapshots
     * - Enables transport composition
     */
    protected override async writeToTransport<T extends Record<string, unknown>>(entry: Readonly<LogEntry<T>>): Promise<void> {
        // Ensure consistent async context even for sync operations
        await Promise.resolve();

        // Perform atomic state update
        await this.updateStateAsync(() => {
            if (!this.isValidEntry(entry)) {
                return;
            }

            // Add entry with proper type casting
            this.entries.push(entry as LogEntry<Record<string, unknown>>);

            // Maintain size limit efficiently
            if (this.maxEntries > 0 && this.entries.length > this.maxEntries) {
                this.entries = this.entries.slice(-this.maxEntries);
            }
        });
    }

    /**
     * Updates state atomically and notifies callbacks.
     * Ensures state updates and notifications happen in the same tick.
     */
    private async updateStateAsync(updateFn: () => void): Promise<void> {
        // Perform state update
        updateFn();

        // Schedule callback notifications in the next tick
        // This ensures all state updates in the current tick are complete
        await Promise.resolve();
        this.notifyCallbacks();
    }

    /**
     * Sets a filter with type safety and atomic state updates
     */
    public async setFilter(config: Readonly<FilterConfig>): Promise<void> {
        await this.updateStateAsync(() => {
            if (!this.isValidFilterConfig(config)) {
                return;
            }

            this.filters[config.namespace] = config.enabled;
        });
    }

    /**
     * Cleans up resources properly
     */
    protected override async cleanup(): Promise<void> {
        this.callbacks.clear();
        this.entries = [];
        this.filters = {};
        await super.cleanup();
    }

    /**
     * Validates a log entry
     */
    private isValidEntry<T extends Record<string, unknown>>(entry: unknown): entry is LogEntry<T> {
        return entry !== null &&
            typeof entry === 'object' &&
            'level' in entry &&
            'message' in entry &&
            typeof (entry as LogEntry<T>).message === 'string';
    }

    /**
     * Validates filter configuration
     */
    private isValidFilterConfig(config: unknown): config is FilterConfig {
        return config !== null &&
            typeof config === 'object' &&
            'namespace' in config &&
            'enabled' in config &&
            isNonEmptyString((config as FilterConfig).namespace) &&
            typeof (config as FilterConfig).enabled === 'boolean';
    }

    /**
     * Creates an immutable copy of the current state with proper typing
     */
    private getImmutableState(): Readonly<GUITransportState> {
        return {
            entries: Object.freeze([...this.entries]),
            filters: Object.freeze({ ...this.filters })
        };
    }

    /**
     * Notifies callbacks with immutable state.
     * Ensures callbacks can't modify state and handles callback errors.
     */
    private notifyCallbacks(): void {
        const state = this.getImmutableState();
        this.callbacks.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Error in GUI transport callback:', error);
            }
        });
    }
} 