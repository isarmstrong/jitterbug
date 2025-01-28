import type { LogEntry, LogTransport } from "../types/core";
import { BaseTransport, type TransportConfig } from "./types";

export interface ResourceData {
    type: 'resource';
    url: string;
    initiator?: string;
    duration?: number;
    size?: number;
    error?: Error;
}

export interface ResourceTransportConfig extends TransportConfig {
    maxEntries?: number;
    sampleInterval?: number;
    retentionPeriod?: number;
    quotaTypes?: string[];
}

export class ResourceTransport extends BaseTransport {
    protected readonly transportConfig: Required<ResourceTransportConfig>;
    private entries: Array<LogEntry<Record<string, unknown>>> = [];

    constructor(config: ResourceTransportConfig = {}) {
        super(config);
        this.transportConfig = {
            enabled: config.enabled ?? true,
            level: config.level ?? this.config.level,
            format: config.format ?? this.config.format,
            maxEntries: config.maxEntries ?? 1000,
            sampleInterval: config.sampleInterval ?? 1000,
            retentionPeriod: config.retentionPeriod ?? 3600000,
            quotaTypes: config.quotaTypes ?? ['script', 'style', 'image', 'font']
        };
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const resourceData = entry.data as ResourceData | undefined;
        if (!resourceData || !this.isResourceData(resourceData)) {
            return;
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

        // Clean up old entries
        const now = Date.now();
        this.entries = this.entries.filter(entry => {
            const entryTime = new Date(entry.context?.timestamp ?? 0).getTime();
            return now - entryTime < this.transportConfig.retentionPeriod;
        });
    }

    private isResourceData(data: unknown): data is ResourceData {
        if (typeof data !== 'object' || data === null) {
            return false;
        }

        const rData = data as Partial<ResourceData>;

        if (rData.type !== 'resource') {
            return false;
        }

        if (typeof rData.url !== 'string') {
            return false;
        }

        if (rData.initiator !== undefined && typeof rData.initiator !== 'string') {
            return false;
        }

        if (rData.duration !== undefined && typeof rData.duration !== 'number') {
            return false;
        }

        if (rData.size !== undefined && typeof rData.size !== 'number') {
            return false;
        }

        if (rData.error !== undefined && !(rData.error instanceof Error)) {
            return false;
        }

        return true;
    }

    public getEntries(): ReadonlyArray<LogEntry<Record<string, unknown>>> {
        return Object.freeze([...this.entries]);
    }
} 