import { AsyncBaseTransport } from "./async-base";
import type { LogEntry } from '../types/core';

// Component lifecycle stages
type ComponentStage = 'dormant' | 'hydrating' | 'active' | 'suspended';

// Growth patterns for components
interface GrowthPattern {
    readonly initialSize: number;
    readonly maxSize: number;
    readonly pruneThreshold: number;
}

// Living system metrics
interface VitalSigns {
    readonly hydrationTime: number;
    readonly interactivityDelay: number;
    readonly memoryFootprint: number;
}

// Component ecosystem health
interface SystemHealth {
    readonly activeComponents: number;
    readonly totalHydrated: number;
    readonly averageHydrationTime: number;
    readonly vitalSigns: VitalSigns;
}

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
 * Hydration-specific data structure with living system characteristics
 */
export interface HydrationData extends BaseTransportData {
    readonly type: "hydration";
    readonly component: string;
    readonly props: Readonly<Record<string, unknown>>;
    readonly duration: number;
    readonly stage: ComponentStage;
    readonly vitalSigns?: VitalSigns;
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
    readonly growthPattern?: GrowthPattern;
}

/**
 * Specialized log entry type for hydration events
 */
type HydrationLogEntry = Readonly<LogEntry<HydrationData>>;

/**
 * Transport for tracking React component hydration as a living system
 */
export class HydrationTransport extends AsyncBaseTransport {
    private readonly trackComponents: boolean;
    private readonly maxComponentHistory: number;
    private readonly growthPattern: GrowthPattern;
    private entries: Array<HydrationLogEntry>;
    private readonly componentHistory: Map<string, number>;
    private readonly vitalStats: Map<string, VitalSigns>;

    constructor(config: Readonly<HydrationTransportConfig> = {}) {
        super();
        this.trackComponents = config.trackComponents ?? true;
        this.maxComponentHistory = config.maxComponentHistory ?? 10;
        this.growthPattern = config.growthPattern ?? {
            initialSize: 10,
            maxSize: 100,
            pruneThreshold: 0.8
        };
        this.entries = [];
        this.componentHistory = new Map();
        this.vitalStats = new Map();
    }

    protected override async writeToTransport<T extends Record<string, unknown>>(
        entry: Readonly<LogEntry<T>>
    ): Promise<void> {
        if (!this.isValidEntry(entry)) {
            return;
        }

        const candidate = entry.data;
        if (!this.isHydrationData(candidate)) {
            return;
        }

        // Create immutable hydration entry with vital signs
        const hydrationEntry: HydrationLogEntry = {
            level: entry.level,
            message: entry.message,
            error: entry.error,
            warnings: entry.warnings ? [...entry.warnings] : undefined,
            _metadata: entry._metadata ? { ...entry._metadata } : undefined,
            data: {
                ...candidate,
                vitalSigns: this.measureVitalSigns(candidate)
            },
            context: undefined
        };

        await this.processEntry(Object.freeze(hydrationEntry));
    }

    private measureVitalSigns(data: HydrationData): VitalSigns {
        return {
            hydrationTime: data.duration,
            interactivityDelay: this.calculateInteractivityDelay(data),
            memoryFootprint: this.estimateMemoryFootprint(data)
        };
    }

    private calculateInteractivityDelay(data: HydrationData): number {
        // Implementation would measure time to interactive
        return data.duration * 1.2; // Simplified example
    }

    private estimateMemoryFootprint(data: HydrationData): number {
        // Implementation would estimate memory usage
        return JSON.stringify(data.props).length; // Simplified example
    }

    private async processEntry(entry: Readonly<HydrationLogEntry>): Promise<void> {
        // Maintain ecosystem balance
        if (this.entries.length >= this.growthPattern.maxSize) {
            await this.prune();
        }

        this.entries.push(entry);

        // Update vital statistics
        if (this.trackComponents && this.isHydrationData(entry.data)) {
            await this.updateComponentHealth(entry.data);
        }
    }

    private async prune(): Promise<void> {
        const threshold = Math.floor(this.growthPattern.maxSize * this.growthPattern.pruneThreshold);
        this.entries = this.entries.slice(-threshold);
        await Promise.resolve(); // Ensure async context
    }

    private async updateComponentHealth(data: Readonly<HydrationData>): Promise<void> {
        const { component } = data;
        if (typeof component !== 'string' || component.length === 0) return;

        // Update component history
        const count = this.componentHistory.get(component) ?? 0;
        this.componentHistory.set(component, count + 1);

        // Update vital statistics
        this.vitalStats.set(component, data.vitalSigns ?? this.measureVitalSigns(data));

        // Natural selection - remove least vital components when over capacity
        if (this.componentHistory.size > this.maxComponentHistory) {
            const leastVital = this.findLeastVitalComponent();
            if (typeof leastVital === 'string' && leastVital.length > 0) {
                this.componentHistory.delete(leastVital);
                this.vitalStats.delete(leastVital);
            }
        }

        await Promise.resolve(); // Ensure async context
    }

    private findLeastVitalComponent(): string | undefined {
        let leastVital: string | undefined;
        let lowestVitality = Number.MAX_SAFE_INTEGER;

        for (const [component, stats] of this.vitalStats.entries()) {
            if (typeof component !== 'string') continue;
            if (component.length === 0) continue;

            const vitality = this.calculateVitality(stats);
            if (vitality < lowestVitality) {
                lowestVitality = vitality;
                leastVital = component;
            }
        }

        return leastVital;
    }

    private calculateVitality(stats: VitalSigns): number {
        return (
            1 / (stats.hydrationTime * stats.interactivityDelay) *
            (1000000 / Math.max(stats.memoryFootprint, 1))
        );
    }

    /**
     * Type guard that maintains type safety through discriminated unions
     */
    private isHydrationData(data: unknown): data is Readonly<HydrationData> {
        if (!this.isBaseTransportData(data)) {
            return false;
        }

        const candidate = data as Partial<HydrationData>;
        if (candidate.type !== 'hydration') {
            return false;
        }

        if (typeof candidate.component !== 'string' || candidate.component.length === 0) {
            return false;
        }

        if (typeof candidate.count !== 'number') {
            return false;
        }

        if (typeof candidate.duration !== 'number') {
            return false;
        }

        if (candidate.error !== undefined && !(candidate.error instanceof Error)) {
            return false;
        }

        return true;
    }

    /**
     * Type guard for validating log entries
     */
    private isValidEntry<T extends Record<string, unknown>>(entry: unknown): entry is Readonly<LogEntry<T>> {
        if (entry === null || typeof entry !== 'object') {
            return false;
        }

        if (!('data' in entry)) {
            return false;
        }

        const logEntry = entry as LogEntry<T>;
        return typeof logEntry.data === 'object' && logEntry.data !== null;
    }

    /**
     * Type guard for base transport data
     */
    private isBaseTransportData(data: unknown): data is Readonly<BaseTransportData> {
        if (typeof data !== "object" || data === null) {
            return false;
        }

        if (!("type" in data)) {
            return false;
        }

        return typeof (data as { type: unknown }).type === "string";
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

    /**
     * Get the current health status of the hydration system
     */
    public getSystemHealth(): SystemHealth {
        const activeComponents = this.componentHistory.size;
        const totalHydrated = this.entries.length;

        // Calculate average hydration time
        let totalTime = 0;
        for (const stats of this.vitalStats.values()) {
            totalTime += stats.hydrationTime;
        }
        const averageHydrationTime = activeComponents > 0 ? totalTime / activeComponents : 0;

        // Get the most recent vital signs from a valid entry
        const latestEntry = this.entries[this.entries.length - 1];
        const defaultVitalSigns: VitalSigns = {
            hydrationTime: 0,
            interactivityDelay: 0,
            memoryFootprint: 0
        };

        let vitalSigns = defaultVitalSigns;
        if (latestEntry !== undefined && this.isHydrationData(latestEntry.data)) {
            vitalSigns = latestEntry.data.vitalSigns ?? defaultVitalSigns;
        }

        return {
            activeComponents,
            totalHydrated,
            averageHydrationTime,
            vitalSigns
        };
    }

    protected override async cleanup(): Promise<void> {
        this.entries = [];
        this.componentHistory.clear();
        this.vitalStats.clear();
        await super.cleanup();
    }
} 