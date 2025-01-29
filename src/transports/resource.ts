import type { LogEntry } from "../types/core";
import { AsyncBaseTransport } from "./async-base";

/**
 * Base type for all transportable data with type discrimination
 */
export interface BaseTransportData {
    readonly type: string;
}

/**
 * Resource-specific data structure with type discrimination
 */
export interface ResourceData extends BaseTransportData {
    readonly type: 'resource';
    readonly url: string;
    readonly initiator: string;
    readonly duration: number;
    readonly size?: number;
    readonly error?: Error;
    readonly timestamp?: number;
}

/**
 * Type-safe configuration for resource transport
 */
export interface ResourceTransportConfig {
    readonly maxEntries?: number;
    readonly sampleInterval?: number;
    readonly retentionPeriod?: number;
    readonly quotaTypes?: ReadonlyArray<string>;
}

/**
 * Type alias for resource-specific log entries
 */
type ResourceLogEntry = Readonly<LogEntry<ResourceData>>;

/**
 * Transport for tracking resource loading and performance
 * 
 * Type Invariant: this.entries always contains valid ResourceLogEntry objects
 * This is maintained by:
 * 1. Only adding entries through writeToTransport which validates the data
 * 2. Never modifying entries directly, only through type-safe methods
 * 3. Immutable entry objects prevent external modifications
 */
export class ResourceTransport extends AsyncBaseTransport {
    private readonly maxEntries: number;
    private readonly sampleInterval: number;
    private readonly retentionPeriod: number;
    private readonly quotaTypes: ReadonlyArray<string>;
    private entries: Array<ResourceLogEntry>;
    private lastSampleTime: number;

    constructor(config: Readonly<ResourceTransportConfig> = {}) {
        super();
        this.maxEntries = config.maxEntries ?? 1000;
        this.sampleInterval = config.sampleInterval ?? 1000;
        this.retentionPeriod = config.retentionPeriod ?? 60000;
        this.quotaTypes = Object.freeze(config.quotaTypes ?? ["image", "script", "stylesheet"]);
        this.entries = [];
        this.lastSampleTime = 0;
    }

    /**
     * Writes a resource entry to the transport with proper sampling and cleanup.
     * This method maintains an async signature for consistency with the AsyncBaseTransport interface,
     * and handles asynchronous sampling coordination.
     * 
     * Design Pattern: "Async Contract Preservation" with "Coordinated Sampling"
     * - Maintains interface consistency across transports
     * - Coordinates sampling intervals
     * - Ensures atomic cleanup operations
     * - Provides immutable entry snapshots
     */
    protected override async writeToTransport<T extends Record<string, unknown>>(
        entry: Readonly<LogEntry<T>>
    ): Promise<void> {
        // Ensure consistent async context
        await Promise.resolve();

        if (!this.isValidEntry(entry)) {
            return;
        }

        const data = entry.data;
        if (!this.isResourceData(data)) {
            return;
        }

        const now = Date.now();

        // Coordinate sampling interval
        if (now - this.lastSampleTime < this.sampleInterval) {
            return;
        }

        // Perform atomic cleanup and update
        await this.updateEntriesAsync(now, () => {
            this.lastSampleTime = now;
            this.cleanOldEntries(now);

            // Create immutable resource entry
            const resourceEntry = Object.freeze({
                level: entry.level,
                message: entry.message,
                data: Object.freeze({
                    ...data,
                    timestamp: entry.context?.timestamp ?? now
                }),
                context: undefined,  // Resource entries don't use context
                error: entry.error,
                warnings: entry.warnings ? Object.freeze([...entry.warnings]) : undefined,
                _metadata: entry._metadata ? Object.freeze({ ...entry._metadata }) : undefined
            }) as ResourceLogEntry;

            // Maintain size limit with efficient array operations
            if (this.entries.length >= this.maxEntries) {
                this.entries = this.entries.slice(1);
            }
            this.entries.push(resourceEntry);
        });
    }

    /**
     * Updates entries with proper coordination of cleanup and updates.
     * Ensures atomic operations and maintains type safety.
     */
    private async updateEntriesAsync(timestamp: number, updateFn: () => void): Promise<void> {
        try {
            // Perform update
            updateFn();

            // Schedule any necessary async cleanup
            if (this.shouldPerformCleanup(timestamp)) {
                await this.performAsyncCleanup();
            }
        } catch (error) {
            console.error('Error updating resource entries:', error);
            throw error; // Re-throw to maintain error boundary
        }
    }

    /**
     * Determines if cleanup should be performed based on timestamp
     */
    private shouldPerformCleanup(timestamp: number): boolean {
        return this.entries.length > this.maxEntries ||
            timestamp - this.lastSampleTime > this.retentionPeriod;
    }

    /**
     * Performs asynchronous cleanup operations
     */
    private async performAsyncCleanup(): Promise<void> {
        // Ensure we're in an async context
        await Promise.resolve();

        const now = Date.now();
        this.cleanOldEntries(now);

        // Additional async cleanup could be added here
        // For example, persisting entries or notifying listeners
    }

    /**
     * Type guard for validating log entries
     */
    private isValidEntry<T extends Record<string, unknown>>(entry: unknown): entry is Readonly<LogEntry<T>> {
        return entry !== null &&
            typeof entry === 'object' &&
            'data' in entry &&
            typeof (entry as LogEntry<T>).data === 'object' &&
            (entry as LogEntry<T>).data !== null;
    }

    /**
     * Type guard for resource data with discriminated union pattern
     */
    private isResourceData(data: unknown): data is Readonly<ResourceData> {
        if (!this.isBaseTransportData(data)) {
            return false;
        }

        const candidate = data as Partial<ResourceData>;
        return (
            candidate.type === "resource" &&
            typeof candidate.url === "string" &&
            typeof candidate.initiator === "string" &&
            typeof candidate.duration === "number" &&
            (candidate.size === undefined || typeof candidate.size === "number") &&
            (candidate.error === undefined || candidate.error instanceof Error) &&
            (candidate.timestamp === undefined || typeof candidate.timestamp === "number")
        );
    }

    /**
     * Type guard for base transport data
     */
    private isBaseTransportData(data: unknown): data is Readonly<BaseTransportData> {
        return (
            typeof data === "object" &&
            data !== null &&
            "type" in data &&
            typeof (data as { type: unknown }).type === "string"
        );
    }

    /**
     * Removes entries older than the retention period
     * Type Safety: We maintain the invariant that this.entries contains valid ResourceLogEntry objects
     */
    private cleanOldEntries(now: number): void {
        const cutoff = now - this.retentionPeriod;
        this.entries = this.entries.filter(entry => {
            if (!this.isResourceData(entry.data)) return false;
            const timestamp = entry.data.timestamp;
            return timestamp !== undefined && timestamp > cutoff;
        });
    }

    /**
     * Returns a readonly view of all entries
     */
    public getEntries(): ReadonlyArray<ResourceLogEntry> {
        return Object.freeze([...this.entries]);
    }

    /**
     * Calculates resource usage by type with immutable results
     * Type Safety: We maintain the invariant that this.entries contains valid ResourceLogEntry objects
     */
    public getQuotaUsage(): ReadonlyMap<string, number> {
        const usage = new Map<string, number>();

        for (const entry of this.entries) {
            if (!this.isResourceData(entry.data)) continue;
            const { size, initiator } = entry.data;
            if (size !== undefined && this.quotaTypes.includes(initiator)) {
                const current = usage.get(initiator) ?? 0;
                usage.set(initiator, current + size);
            }
        }

        // Convert to readonly map
        return new Map(usage) as ReadonlyMap<string, number>;
    }

    protected override async cleanup(): Promise<void> {
        this.entries = [];
        this.lastSampleTime = 0;
        await super.cleanup();
    }
} 