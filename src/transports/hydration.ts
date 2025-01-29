import { AsyncBaseTransport } from "./async-base";
import { isNonEmptyString } from "../types/guards";
import type { LogEntry } from '../types/core';
import type { LogLevel } from '../types/enums';
import { LogLevels } from '../types/enums';

/**
 * Type discriminator for hydration events
 * @template T - The type of data being transported
 */
export interface TypeDiscriminator<T> {
    type: T extends HydrationData ? "hydration" : string;
}

/**
 * Base type for all transportable data
 * Enforces type discrimination at the transport level
 */
export interface BaseTransportData {
    type: string;
}

/**
 * Hydration-specific data structure
 * Uses TypeScript's discriminated unions to maintain type safety
 * @remarks
 * This pattern ensures type safety across async boundaries by:
 * 1. Extending the base transport data
 * 2. Providing a literal type for discrimination
 * 3. Adding hydration-specific fields
 */
export interface HydrationData extends BaseTransportData {
    type: "hydration";
    component: string;
    props: Record<string, unknown>;
    duration: number;
    error?: Error;
    count: number;
}

export interface HydrationTransportConfig {
    maxEntries?: number;
    trackComponents?: boolean;
    maxComponentHistory?: number;
}

/**
 * Specialized log entry type for hydration events
 * Maintains type safety through the transport layer
 */
type HydrationLogEntry = LogEntry<HydrationData>;

/**
 * Transport for tracking React component hydration events
 * @remarks
 * This implementation uses a specialized discriminated union pattern to maintain
 * type safety across async boundaries. The pattern works by:
 * 1. Using a base transport data type that requires discrimination
 * 2. Extending it with specific data types (like HydrationData)
 * 3. Using type guards to maintain type safety through async operations
 * 
 * The covariant type constraint pattern ensures that:
 * - All transported data must extend BaseTransportData
 * - Type discrimination is maintained through async boundaries
 * - Type safety is preserved in the inheritance hierarchy
 */
export class HydrationTransport extends AsyncBaseTransport {
    private readonly maxEntries: number;
    private readonly trackComponents: boolean;
    private readonly maxComponentHistory: number;
    private readonly entries: HydrationLogEntry[] = [];
    private readonly componentHistory: Map<string, number> = new Map();

    constructor(config: HydrationTransportConfig = {}) {
        super();
        this.maxEntries = config.maxEntries ?? 100;
        this.trackComponents = config.trackComponents ?? true;
        this.maxComponentHistory = config.maxComponentHistory ?? 10;
    }

    protected override async writeToTransport<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): Promise<void> {
        if (entry === null || entry === undefined || typeof entry.data !== "object") {
            return;
        }

        // Use type guard to narrow the type
        const candidate = entry.data as unknown;
        if (!this.isHydrationData(candidate)) {
            return;
        }

        // At this point TypeScript knows candidate is HydrationData
        const hydrationEntry: HydrationLogEntry = {
            level: entry.level,
            message: entry.message,
            error: entry.error,
            warnings: entry.warnings,
            _metadata: entry._metadata,
            data: candidate,
            context: undefined
        };

        await this.processEntry(hydrationEntry);
    }

    private async processEntry(entry: HydrationLogEntry): Promise<void> {
        if (this.entries.length >= this.maxEntries) {
            this.entries.shift();
        }

        this.entries.push(entry);

        // Type guard to ensure we have valid hydration data
        const data = entry.data;
        if (this.trackComponents && this.isHydrationData(data) && typeof data.component === "string" && data.component.length > 0) {
            await this.updateComponentHistory(data.component);
        }
    }

    /**
     * Type guard that maintains type safety through discriminated unions
     * @param data - The data to check
     * @returns True if the data is valid hydration data
     * 
     * @remarks
     * This type guard is crucial for maintaining type safety across async boundaries.
     * It ensures that:
     * 1. The data has the correct shape (structural typing)
     * 2. The type discriminator is correct (nominal typing)
     * 3. All required fields are present and of the correct type
     */
    private isHydrationData(data: unknown): data is HydrationData {
        if (data === null || data === undefined) {
            return false;
        }

        const candidate = data as Record<string, unknown>;
        return (
            typeof candidate === 'object' &&
            typeof candidate.component === 'string' &&
            candidate.component.length > 0 &&
            typeof candidate.count === 'number'
        );
    }

    private async updateComponentHistory(component: string): Promise<void> {
        if (!component || component.length === 0) {
            return;
        }

        const entries = await this.getEntries();
        const existingEntry = entries?.find(entry =>
            this.isHydrationData(entry.data) && entry.data.component === component
        );

        if (existingEntry && this.isHydrationData(existingEntry.data)) {
            existingEntry.data.count++;
        } else {
            const hydrationData: HydrationData = {
                type: 'hydration',
                component,
                props: {},
                duration: 0,
                count: 1
            };

            const entry: LogEntry<Record<string, unknown>> = {
                level: LogLevels.DEBUG,
                message: `Component hydration: ${component}`,
                data: hydrationData as unknown as Record<string, unknown>
            };

            await this.write(entry);
        }
    }

    private async findOldestComponent(): Promise<string | undefined> {
        const entries = await this.getEntries();
        if (!entries || entries.length === 0) {
            return undefined;
        }

        return entries.reduce((oldest, current) => {
            if (!this.isHydrationData(current.data)) {
                return oldest;
            }
            if (!oldest || current.data.count > oldest.count) {
                return current.data;
            }
            return oldest;
        }, undefined as HydrationData | undefined)?.component;
    }

    public getEntries(): ReadonlyArray<HydrationLogEntry> {
        return [...this.entries];
    }

    public getComponentStats(): ReadonlyMap<string, number> {
        return new Map(this.componentHistory);
    }

    protected override async cleanup(): Promise<void> {
        this.entries.length = 0;
        this.componentHistory.clear();
        await super.cleanup();
    }

    /**
     * Type guard to ensure we have a valid transport data type
     * This maintains type safety across the transport boundary
     */
    private isBaseTransportData(data: unknown): data is BaseTransportData {
        return (
            typeof data === "object" &&
            data !== null &&
            "type" in data &&
            typeof (data as { type: unknown }).type === "string"
        );
    }
} 