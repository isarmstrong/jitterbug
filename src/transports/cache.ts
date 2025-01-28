import type { LogEntry } from "../types/core";
import { BaseTransport } from "./types";

export interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
    staleHits: number;
    revalidations: number;
    size: number;
    lastEvictionTime: number;
    keyUsage: Map<string, number>;
    avgRevalidationTime: number;
}

export interface CacheConfig {
    maxAge: number;
    staleWhileRevalidate?: number;
    maxEntries?: number;
}

export class CacheTransport extends BaseTransport {
    private readonly maxAge: number;
    private readonly staleWhileRevalidate: number;
    private readonly maxEntries: number;
    private readonly cache: Map<string, { entry: LogEntry<unknown>; timestamp: number }>;
    private metrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        staleHits: 0,
        revalidations: 0,
        size: 0,
        lastEvictionTime: 0,
        keyUsage: new Map(),
        avgRevalidationTime: 0
    };

    constructor(config: CacheConfig) {
        super({
            enabled: true,
            format: "json"
        });

        this.maxAge = config.maxAge;
        this.staleWhileRevalidate = config.staleWhileRevalidate ?? 0;
        this.maxEntries = config.maxEntries ?? 1000;
        this.cache = new Map();
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const key = this.generateKey(entry);
        this.cache.set(key, { entry, timestamp: Date.now() });

        if (this.cache.size > this.maxEntries) {
            this.evictOldest();
        }
    }

    public async read<T extends Record<string, unknown>>(key: string): Promise<LogEntry<T> | null> {
        const cached = await Promise.resolve(this.cache.get(key));
        if (!cached) {
            this.metrics.misses++;
            return null;
        }

        const age = Date.now() - cached.timestamp;
        if (typeof age === 'number' && age <= this.maxAge) {
            this.metrics.hits++;
            return cached.entry as LogEntry<T>;
        }

        if (typeof age === 'number' && age <= this.maxAge + this.staleWhileRevalidate) {
            this.metrics.staleHits++;
            this.revalidate(key).catch(console.error);
            return cached.entry as LogEntry<T>;
        }

        this.cache.delete(key);
        this.metrics.evictions++;
        this.metrics.lastEvictionTime = Date.now();
        this.metrics.size = this.cache.size;
        return null;
    }

    public getMetrics(): Readonly<CacheMetrics> {
        return Object.freeze({
            ...this.metrics,
            keyUsage: new Map(this.metrics.keyUsage)
        });
    }

    private generateKey(entry: LogEntry<unknown>): string {
        return `${entry.level}:${entry.message}:${Date.now()}`;
    }

    private evictOldest(): void {
        const oldestKey = Array.from(this.cache.entries())
            .reduce((oldest, [key, value]) => {
                if (!oldest.timestamp || value.timestamp < oldest.timestamp) {
                    return { key, timestamp: value.timestamp };
                }
                return oldest;
            }, { key: "", timestamp: 0 }).key;

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.metrics.evictions++;
            this.metrics.lastEvictionTime = Date.now();
            this.metrics.size = this.cache.size;
        }
    }

    private async revalidate(key: string): Promise<void> {
        try {
            const cached = this.cache.get(key);
            if (cached) {
                const entry = cached.entry;
                this.cache.set(key, { entry, timestamp: Date.now() });
                this.metrics.revalidations++;
            }
        } catch (error) {
            console.error("Failed to revalidate cache entry:", error);
        }
    }
} 