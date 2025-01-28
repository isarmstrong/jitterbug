import type { LogEntry, LogTransport } from "../types/core";
import { BaseTransport, type TransportConfig } from "./types";

export interface HydrationData {
    type: 'client' | 'server';
    component: string;
    props?: Record<string, unknown>;
    duration?: number;
    error?: Error;
}

export interface HydrationTransportConfig extends TransportConfig {
    maxEntries?: number;
    trackComponents?: boolean;
    maxComponentHistory?: number;
}

export class HydrationTransport extends BaseTransport {
    protected readonly transportConfig: Required<HydrationTransportConfig>;
    private entries: Array<LogEntry<Record<string, unknown>>> = [];
    private componentHistory: Map<string, number> = new Map();

    constructor(config: HydrationTransportConfig = {}) {
        super(config);
        this.transportConfig = {
            enabled: config.enabled ?? true,
            level: config.level ?? this.config.level,
            format: config.format ?? this.config.format,
            maxEntries: config.maxEntries ?? 1000,
            trackComponents: config.trackComponents ?? true,
            maxComponentHistory: config.maxComponentHistory ?? 100
        };
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const hydrationData = entry.data as HydrationData | undefined;
        if (!hydrationData || !this.isHydrationData(hydrationData)) {
            return;
        }

        // Track component usage if enabled
        if (this.transportConfig.trackComponents) {
            const count = (this.componentHistory.get(hydrationData.component) ?? 0) + 1;
            this.componentHistory.set(hydrationData.component, count);

            // Prune history if needed
            if (this.componentHistory.size > this.transportConfig.maxComponentHistory) {
                const oldest = Array.from(this.componentHistory.entries())
                    .sort(([, a], [, b]) => a - b)[0];
                if (oldest) {
                    this.componentHistory.delete(oldest[0]);
                }
            }
        }

        // Add entry with timestamp
        const timestamp = entry.context?.timestamp ?? new Date().toISOString();
        this.entries.push({
            ...entry,
            context: {
                ...entry.context,
                timestamp
            }
        });

        // Enforce entry limit
        if (this.entries.length > this.transportConfig.maxEntries) {
            this.entries = this.entries.slice(-this.transportConfig.maxEntries);
        }
    }

    private isHydrationData(data: unknown): data is HydrationData {
        if (typeof data !== 'object' || data === null) {
            return false;
        }

        const hData = data as Partial<HydrationData>;

        if (typeof hData.type !== 'string' || !['client', 'server'].includes(hData.type)) {
            return false;
        }

        if (typeof hData.component !== 'string') {
            return false;
        }

        if (hData.duration !== undefined && typeof hData.duration !== 'number') {
            return false;
        }

        if (hData.error !== undefined && !(hData.error instanceof Error)) {
            return false;
        }

        return true;
    }

    public getEntries(): ReadonlyArray<LogEntry<Record<string, unknown>>> {
        return Object.freeze([...this.entries]);
    }

    public getComponentStats(): ReadonlyMap<string, number> {
        return new Map(this.componentHistory);
    }
} 