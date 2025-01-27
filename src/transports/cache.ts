import { LogEntry, LogTransport, LogLevel } from "../types";
import { BaseTransport, TransportConfig } from "./types";

export interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
    staleHits: number;
    revalidations: number;
    size: number;
    lastEvictionTime: number | null;
    keyUsage: Map<string, number>;
    avgRevalidationTime: number;
}

export interface CacheConfig extends TransportConfig {
    maxSize?: number;
    maxAge?: number;
    staleWhileRevalidate?: number;
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    lastAccess: number;
    key: string;
    isRevalidating: boolean;
}

export class CacheTransport extends BaseTransport implements LogTransport {
    private cache: Map<string, CacheEntry<LogEntry<Record<string, unknown>>>> = new Map();
    private metrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        staleHits: 0,
        revalidations: 0,
        size: 0,
        lastEvictionTime: null,
        keyUsage: new Map(),
        avgRevalidationTime: 0
    };
    private revalidationTimes: number[] = [];
    private readonly maxSize: number;
    private readonly maxAge: number;
    private readonly staleWhileRevalidate: number;

    constructor(config?: CacheConfig) {
        super(config);
        this.maxSize = config?.maxSize ?? 1000;
        this.maxAge = config?.maxAge ?? 5 * 60 * 1000; // 5 minutes
        this.staleWhileRevalidate = config?.staleWhileRevalidate ?? 60 * 1000; // 1 minute
    }

    public async write<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): Promise<void> {
        const key = this.generateKey(entry);
        const now = Date.now();

        // Update key usage metrics
        this.metrics.keyUsage.set(key, (this.metrics.keyUsage.get(key) ?? 0) + 1);

        // Create cache entry
        const cacheEntry: CacheEntry<LogEntry<Record<string, unknown>>> = {
            value: entry,
            timestamp: now,
            lastAccess: now,
            key,
            isRevalidating: false
        };

        // Check if we need to evict
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, cacheEntry);
        this.metrics.size = this.cache.size;

        return Promise.resolve();
    }

    public async read<T extends Record<string, unknown>>(
        namespace: string,
        level: LogLevel,
        timestamp?: number
    ): Promise<LogEntry<T> | null> {
        const key = this.generateKeyFromParts(namespace, level, timestamp);
        const now = Date.now();
        const entry = this.cache.get(key);

        if (!entry) {
            this.metrics.misses++;
            return null;
        }

        // Update last access time
        entry.lastAccess = now;
        const age = now - entry.timestamp;

        // Check if entry is fresh
        if (age <= this.maxAge) {
            this.metrics.hits++;
            return entry.value as LogEntry<T>;
        }

        // Check if entry is stale but usable
        if (age <= this.maxAge + this.staleWhileRevalidate) {
            this.metrics.staleHits++;

            // Trigger revalidation if not already in progress
            if (!entry.isRevalidating) {
                void this.revalidate(entry);
            }

            return entry.value as LogEntry<T>;
        }

        // Entry is too old
        this.cache.delete(key);
        this.metrics.evictions++;
        this.metrics.lastEvictionTime = now;
        this.metrics.size = this.cache.size;
        return null;
    }

    public getMetrics(): Readonly<CacheMetrics> {
        return Object.freeze({
            ...this.metrics,
            keyUsage: new Map(this.metrics.keyUsage)
        });
    }

    private async revalidate(entry: CacheEntry<LogEntry<Record<string, unknown>>>): Promise<void> {
        const startTime = performance.now();
        entry.isRevalidating = true;

        try {
            // Simulate revalidation delay (replace with actual revalidation logic)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Update revalidation metrics
            this.metrics.revalidations++;
            const revalidationTime = performance.now() - startTime;
            this.revalidationTimes.push(revalidationTime);

            // Keep last 100 revalidation times
            if (this.revalidationTimes.length > 100) {
                this.revalidationTimes.shift();
            }

            this.metrics.avgRevalidationTime =
                this.revalidationTimes.reduce((a, b) => a + b, 0) / this.revalidationTimes.length;

        } finally {
            entry.isRevalidating = false;
        }
    }

    private generateKey(entry: LogEntry<Record<string, unknown>>): string {
        return this.generateKeyFromParts(
            entry.context.namespace,
            entry.level,
            new Date(entry.context.timestamp).getTime()
        );
    }

    private generateKeyFromParts(
        namespace: string,
        level: LogLevel,
        timestamp?: number
    ): string {
        return `${namespace}:${level}${timestamp ? `:${timestamp}` : ''}`;
    }

    private evictOldest(): void {
        let oldestTime = Infinity;
        let oldestKey: string | null = null;

        // Find the least recently accessed entry
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.metrics.evictions++;
            this.metrics.lastEvictionTime = Date.now();
            this.metrics.size = this.cache.size;
        }
    }
} 