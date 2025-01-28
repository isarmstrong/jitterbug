import type { LogEntry } from "../types/core";
import { BaseTransport } from "./types";

export interface HydrationData {
    type: "hydration";
    component: string;
    props: Record<string, unknown>;
    duration: number;
    error?: Error;
}

export interface HydrationTransportConfig {
    maxEntries?: number;
    trackComponents?: boolean;
    maxComponentHistory?: number;
}

export class HydrationTransport extends BaseTransport {
    private readonly maxEntries: number;
    private readonly trackComponents: boolean;
    private readonly maxComponentHistory: number;
    private readonly entries: Array<LogEntry<HydrationData>> = [];
    private readonly componentHistory: Map<string, number> = new Map();

    constructor(config: HydrationTransportConfig = {}) {
        super({
            enabled: true,
            format: "json"
        });

        this.maxEntries = config.maxEntries ?? 100;
        this.trackComponents = config.trackComponents ?? true;
        this.maxComponentHistory = config.maxComponentHistory ?? 10;
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        if (!this.isHydrationData(entry.data)) {
            return;
        }

        if (this.entries.length >= this.maxEntries) {
            this.entries.shift();
        }

        const hydrationEntry = {
            ...entry,
            data: entry.data
        } as LogEntry<HydrationData>;

        this.entries.push(hydrationEntry);

        if (this.trackComponents) {
            this.updateComponentHistory(entry.data.component);
        }
    }

    private isHydrationData(data: unknown): data is HydrationData {
        if (!data || typeof data !== "object") {
            return false;
        }

        const d = data as Partial<HydrationData>;
        return (
            d.type === "hydration" &&
            typeof d.component === "string" &&
            typeof d.props === "object" &&
            d.props !== null &&
            typeof d.duration === "number" &&
            (d.error === undefined || d.error instanceof Error)
        );
    }

    private updateComponentHistory(component: string): void {
        const count = (this.componentHistory.get(component) ?? 0) + 1;
        this.componentHistory.set(component, count);

        if (this.componentHistory.size > this.maxComponentHistory) {
            const oldestComponent = Array.from(this.componentHistory.entries())
                .reduce((oldest, [key, value]) => {
                    if (!oldest.value || value < oldest.value) {
                        return { key, value };
                    }
                    return oldest;
                }, { key: "", value: 0 }).key;

            if (oldestComponent) {
                this.componentHistory.delete(oldestComponent);
            }
        }
    }

    public getEntries(): ReadonlyArray<LogEntry<HydrationData>> {
        return [...this.entries];
    }

    public getComponentStats(): ReadonlyMap<string, number> {
        return new Map(this.componentHistory);
    }
} 