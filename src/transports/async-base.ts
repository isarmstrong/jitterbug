import type { LogEntry, LogTransport, LogLevel } from "../types/core";
import { BaseTransport } from "./base";
import { isLogLevel } from "../types/guards";

/**
 * Base class for async transports with proper async/await patterns
 */
export abstract class AsyncBaseTransport extends BaseTransport {
    /**
     * Core write implementation that must be provided by concrete transports
     */
    protected abstract writeToTransport<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;

    /**
     * Public write method with proper async handling and type safety
     */
    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        // Validate log level before processing
        if (!isLogLevel(entry.level)) {
            return Promise.resolve();
        }

        try {
            // Concrete implementation in derived class
            await this.writeToTransport(entry);
        } catch (error) {
            // Re-throw as Error with context
            throw error instanceof Error ? error : new Error('Unknown error in transport');
        }
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