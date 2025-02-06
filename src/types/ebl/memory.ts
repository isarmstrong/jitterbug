/**
 * EBL2: Memory Management
 *
 * This module provides basic memory management utilities for the Edge Boundary Layer.
 * The implementations are minimal placeholders, aligning with the simplicity priorities in the README.
 */

// Memory threshold in MB for Edge runtime
const EDGE_MEMORY_THRESHOLD = 128;

// Define memory units for clarity
export const MemoryUnit = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
} as const;

// Define memory metric keys for type safety
export const MemoryMetricKey = {
    HeapUsed: 'heapUsed',
    HeapTotal: 'heapTotal',
    External: 'external',
    ArrayBuffers: 'arrayBuffers',
    Threshold: 'threshold',
    RSS: 'rss'
} as const;

export type MemoryMetricKeyType = typeof MemoryMetricKey[keyof typeof MemoryMetricKey];

// Added type alias for clarity in memory measurements
export type MemoryMB = number;

export interface MemoryMetrics {
    [MemoryMetricKey.HeapUsed]: number;
    [MemoryMetricKey.HeapTotal]: number;
    [MemoryMetricKey.External]: number;
    [MemoryMetricKey.ArrayBuffers]: number;
    [MemoryMetricKey.Threshold]: number;
    [MemoryMetricKey.RSS]?: number;
    memoryThreshold: number;
}

export interface MemoryLayer {
    getMemoryMetrics(): Promise<MemoryMetrics>;
}

// Type-safe WeakMap cache initialization
export function initWeakMapCache<K extends object, V>(): WeakMap<K, V> {
    return new WeakMap<K, V>();
}

// Type-safe memory monitoring
export function monitorMemoryUsage(): void {
    // In a real application, integrate Node.js memory hooks or performance APIs
    console.log('Monitoring memory usage...');
}

// Type-safe memory cleanup
export function cleanupMemory(): void {
    // In a real application, implement cleanup strategies as needed
    if (typeof global.gc === 'function') {
        global.gc();
    }
    console.log('Performing memory cleanup...');
}

// Type-safe memory metrics setup
export function setupMemoryMetrics(): void {
    // In a real application, integrate with monitoring tools to track memory usage
    console.log('Setting up memory metrics...');
}

/**
 * MemoryManager provides methods to retrieve current memory usage metrics.
 */
export class MemoryManager {
    private _memoryThreshold: number = EDGE_MEMORY_THRESHOLD;

    /**
     * Retrieves current memory usage metrics.
     */
    public getMetrics(): MemoryMetrics {
        const usage = process.memoryUsage();
        return {
            [MemoryMetricKey.HeapUsed]: usage.heapUsed / MemoryUnit.MB,
            [MemoryMetricKey.HeapTotal]: usage.heapTotal / MemoryUnit.MB,
            [MemoryMetricKey.External]: usage.external ? usage.external / MemoryUnit.MB : 0,
            [MemoryMetricKey.ArrayBuffers]: usage.arrayBuffers ? usage.arrayBuffers / MemoryUnit.MB : 0,
            [MemoryMetricKey.Threshold]: this._memoryThreshold,
            [MemoryMetricKey.RSS]: usage.rss / MemoryUnit.MB,
            memoryThreshold: this._memoryThreshold
        };
    }

    /**
     * Checks if memory usage has exceeded the configured threshold.
     */
    public isMemoryExceeded(): boolean {
        const metrics = this.getMetrics();
        return metrics[MemoryMetricKey.HeapUsed] > this._memoryThreshold;
    }

    /**
     * Sets a new memory threshold in MB.
     */
    public setMemoryThreshold(newThreshold: number): void {
        this._memoryThreshold = newThreshold;
    }

    /**
     * Gets the current memory threshold in MB.
     */
    public getMemoryThreshold(): number {
        return this._memoryThreshold;
    }

    /**
     * Performs memory cleanup by forcing garbage collection and clearing module caches.
     */
    public cleanup(): void {
        // Force garbage collection if available
        if (typeof global.gc === 'function') {
            global.gc();
        }

        // Clear module caches
        Object.keys(require.cache).forEach(key => {
            delete require.cache[key];
        });

        console.log('Performing memory cleanup...');
    }
} 