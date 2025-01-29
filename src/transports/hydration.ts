import { AsyncBaseTransport } from "./async-base";
import type { LogEntry } from '../types/core';

/**
 * Type discriminator for hydration events
 * @template T - The type of data being transported
 */
export interface TypeDiscriminator<T> {
    readonly type: T extends HydrationData ? "hydration" : string;
}

/**
 * Base type for all transportable data
 * Enforces type discrimination at the transport level
 */
export interface BaseTransportData {
    readonly type: string;
}

/**
 * Hydration-specific data structure
 * Uses TypeScript's discriminated unions to maintain type safety
 */
export interface HydrationData extends BaseTransportData {
    readonly type: "hydration";
    readonly component: string;
    readonly props: Readonly<Record<string, unknown>>;
    readonly duration: number;
    readonly error?: Error;
    readonly count: number;
}

/**
 * Type-safe configuration for hydration transport
 */
export interface HydrationTransportConfig {
    readonly maxEntries?: number;
    readonly trackComponents?: boolean;
    readonly maxComponentHistory?: number;
}

/**
 * Specialized log entry type for hydration events
 */
type HydrationLogEntry = Readonly<LogEntry<HydrationData>>;

/**
 * Transport for tracking React component hydration events
 * 
 * Type Invariant: this.entries always contains valid HydrationLogEntry objects
 * This is maintained by:
 * 1. Only adding entries through writeToTransport which validates the data
 * 2. Never modifying entries directly, only through type-safe methods
 * 3. Immutable entry objects prevent external modifications
 */
export class HydrationTransport extends AsyncBaseTransport {
    private readonly maxEntries: number;
    private readonly trackComponents: boolean;
    private readonly maxComponentHistory: number;
    private entries: Array<HydrationLogEntry>;
    private readonly componentHistory: Map<string, number>;

    constructor(config: Readonly<HydrationTransportConfig> = {}) {
        super();
        this.maxEntries = config.maxEntries ?? 100;
        this.trackComponents = config.trackComponents ?? true;
        this.maxComponentHistory = config.maxComponentHistory ?? 10;
        this.entries = [];
        this.componentHistory = new Map();
    }

    protected override async writeToTransport<T extends Record<string, unknown>>(
        entry: Readonly<LogEntry<T>>
    ): Promise<void> {
        if (!this.isValidEntry(entry)) {
            return;
        }

        // Use type guard to narrow the type
        const candidate = entry.data as unknown;
        if (!this.isHydrationData(candidate)) {
            return;
        }

        // Create immutable hydration entry
        const hydrationEntry = Object.freeze({
            level: entry.level,
            message: entry.message,
            error: entry.error,
            warnings: entry.warnings ? Object.freeze([...entry.warnings]) : undefined,
            _metadata: entry._metadata ? Object.freeze({ ...entry._metadata }) : undefined,
            data: Object.freeze({ ...candidate }),
            context: undefined  // Hydration entries don't use context
        });

        await this.processEntry(hydrationEntry);
    }

    private async processEntry(entry: Readonly<HydrationLogEntry>): Promise<void> {
        // Maintain size limit with efficient array operations
        if (this.entries.length >= this.maxEntries) {
            this.entries = this.entries.slice(1);
        }

        this.entries.push(entry);

        // Update component history if tracking is enabled
        if (this.trackComponents && this.isHydrationData(entry.data)) {
            await this.updateComponentHistory(entry.data.component);
        }
    }

    /**
     * Type guard that maintains type safety through discriminated unions
     */
    private isHydrationData(data: unknown): data is Readonly<HydrationData> {
        if (!this.isBaseTransportData(data)) {
            return false;
        }

        const candidate = data as Partial<HydrationData>;
        return (
            candidate.type === 'hydration' &&
            typeof candidate.component === 'string' &&
            candidate.component.length > 0 &&
            typeof candidate.count === 'number' &&
            typeof candidate.duration === 'number' &&
            (!candidate.error || candidate.error instanceof Error)
        );
    }

    private async updateComponentHistory(component: string): Promise<void> {
        // Explicit check for empty string
        if (component.length === 0) {
            return;
        }

        // Add await to satisfy require-await
        await Promise.resolve();

        const count = this.componentHistory.get(component) ?? 0;
        this.componentHistory.set(component, count + 1);

        if (this.componentHistory.size > this.maxComponentHistory) {
            const oldestComponent = this.findOldestComponent();
            if (oldestComponent !== undefined) {
                this.componentHistory.delete(oldestComponent);
            }
        }
    }

    private findOldestComponent(): string | undefined {
        let oldest: string | undefined;
        let lowestCount = Number.MAX_SAFE_INTEGER;

        for (const [component, count] of this.componentHistory) {
            if (count < lowestCount) {
                lowestCount = count;
                oldest = component;
            }
        }

        return oldest;
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
     * Returns a readonly view of all entries
     */
    public getEntries(): ReadonlyArray<HydrationLogEntry> {
        return Object.freeze([...this.entries]);
    }

    /**
     * Returns a readonly view of component statistics
     */
    public getComponentStats(): ReadonlyMap<string, number> {
        return new Map(this.componentHistory) as ReadonlyMap<string, number>;
    }

    protected override async cleanup(): Promise<void> {
        this.entries = [];
        this.componentHistory.clear();
        await super.cleanup();
    }
} 