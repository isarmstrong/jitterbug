import type { LogEntry } from "../types/core";
import { BaseTransport } from "./types";

export interface ResourceData {
    type: 'resource';
    url: string;
    initiator: string;
    duration: number;
    size?: number;
    error?: Error;
    timestamp?: number;
}

export interface ResourceTransportConfig {
    maxEntries?: number;
    sampleInterval?: number;
    retentionPeriod?: number;
    quotaTypes?: string[];
}

export class ResourceTransport extends BaseTransport {
    private readonly maxEntries: number;
    private readonly sampleInterval: number;
    private readonly retentionPeriod: number;
    private readonly quotaTypes: string[];
    private entries: Array<LogEntry<ResourceData>> = [];
    private lastSampleTime = 0;

    constructor(config: ResourceTransportConfig = {}) {
        super({
            enabled: true,
            format: "json"
        });

        this.maxEntries = config.maxEntries ?? 1000;
        this.sampleInterval = config.sampleInterval ?? 1000;
        this.retentionPeriod = config.retentionPeriod ?? 60000;
        this.quotaTypes = config.quotaTypes ?? ["image", "script", "stylesheet"];
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const data = entry.data;
        if (!this.isResourceData(data)) {
            return;
        }

        const now = Date.now();
        if (now - this.lastSampleTime < this.sampleInterval) {
            return;
        }

        this.lastSampleTime = now;
        this.cleanOldEntries(now);

        if (this.entries.length >= this.maxEntries) {
            this.entries.shift();
        }

        const resourceEntry = {
            ...entry,
            data: {
                ...data,
                timestamp: entry.context?.timestamp ?? now
            }
        } as LogEntry<ResourceData>;

        this.entries.push(resourceEntry);
    }

    private isResourceData(data: unknown): data is ResourceData {
        if (!data || typeof data !== "object") {
            return false;
        }

        const d = data as Partial<ResourceData>;
        return (
            d.type === "resource" &&
            typeof d.url === "string" &&
            typeof d.initiator === "string" &&
            typeof d.duration === "number" &&
            (d.size === undefined || typeof d.size === "number") &&
            (d.error === undefined || d.error instanceof Error) &&
            (d.timestamp === undefined || typeof d.timestamp === "number")
        );
    }

    private cleanOldEntries(now: number): void {
        const cutoff = now - this.retentionPeriod;
        this.entries = this.entries.filter(entry => {
            const data = entry.data as ResourceData;
            const timestamp = data.timestamp ?? 0;
            return timestamp > cutoff;
        });
    }

    public getEntries(): ReadonlyArray<LogEntry<ResourceData>> {
        return [...this.entries];
    }

    public getQuotaUsage(): Map<string, number> {
        const usage = new Map<string, number>();

        for (const entry of this.entries) {
            const data = entry.data as ResourceData;
            if (data.size && this.quotaTypes.includes(data.initiator)) {
                const current = usage.get(data.initiator) ?? 0;
                usage.set(data.initiator, current + data.size);
            }
        }

        return usage;
    }
} 