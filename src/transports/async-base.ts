import type { LogEntry } from "../types/core";
import { BaseTransport } from "./base";

/**
 * Base class for transports that need async capabilities
 * 
 * Design Pattern: "Async Contract Preservation"
 * - Enforces async boundaries for all derived transports
 * - Maintains type safety through generics
 * - Enables transport composition
 */
export abstract class AsyncBaseTransport extends BaseTransport {
    /**
     * Core write implementation that must be provided by concrete transports
     */
    protected abstract writeToTransport<T extends Record<string, unknown>>(
        entry: Readonly<LogEntry<T>>
    ): Promise<void>;

    /**
     * Public write method with proper async handling and type safety
     */
    public async write<T extends Record<string, unknown>>(
        entry: Readonly<LogEntry<T>>
    ): Promise<void> {
        await this.writeToTransport(entry);
    }

    /**
     * Helper method for transports that need to batch writes
     */
    protected async writeBatch<T extends Record<string, unknown>>(entries: LogEntry<T>[]): Promise<void> {
        if (!Array.isArray(entries) || entries.length === 0) {
            return Promise.resolve();
        }

        // Process entries in sequence to maintain order
        for (const entry of entries) {
            await this.write(entry);
        }
    }

    /**
     * Helper method for cleanup operations
     */
    protected async cleanup(): Promise<void> {
        // Base cleanup - can be extended by concrete implementations
        return Promise.resolve();
    }
} 