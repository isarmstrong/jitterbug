import type { LogEntry } from "../types/core";
import { AsyncBaseTransport } from "./async-base";
import { isNonEmptyString } from "../types/guards";

export interface CacheConfig {
    maxEntries?: number;
    maxAge?: number;
    namespace?: string;
}

export class CacheTransport extends AsyncBaseTransport {
    private entries: LogEntry<Record<string, unknown>>[] = [];
    private readonly config: Required<CacheConfig>;
    private lastRevalidation: number = Date.now();

    constructor(config: CacheConfig = {}) {
        super();
        this.config = {
            maxEntries: config.maxEntries ?? 1000,
            maxAge: config.maxAge ?? 60 * 60 * 1000, // 1 hour default
            namespace: config.namespace ?? 'default'
        };
    }

    protected async writeToTransport<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        // Remove old entries if needed
        await this.revalidate();

        // Add new entry
        this.entries.push(entry as LogEntry<Record<string, unknown>>);

        // Trim if over max entries
        if (this.entries.length > this.config.maxEntries) {
            this.entries = this.entries.slice(-this.config.maxEntries);
        }
    }

    public async revalidate(): Promise<void> {
        const now = Date.now();

        // Only revalidate if enough time has passed
        if (now - this.lastRevalidation < this.config.maxAge) {
            return;
        }

        // Remove entries older than maxAge with async validation
        const cutoff = now - this.config.maxAge;
        this.entries = await Promise.all(
            this.entries.filter(async entry => {
                const timestamp = entry.context?.timestamp;
                if (!isNonEmptyString(timestamp)) return false;

                // Add async validation for timestamp parsing
                try {
                    const time = await Promise.resolve(new Date(timestamp).getTime());
                    return time > cutoff;
                } catch {
                    return false;
                }
            })
        );

        this.lastRevalidation = now;
    }

    public getEntries(): ReadonlyArray<LogEntry<Record<string, unknown>>> {
        return [...this.entries];
    }

    public getSize(): number {
        return this.entries.length;
    }

    protected override async cleanup(): Promise<void> {
        this.entries = [];
        await super.cleanup();
    }
} 