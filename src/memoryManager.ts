/**
 * MemoryManager provides methods to retrieve current memory usage metrics.
 */
export class MemoryManager {
    private memoryThreshold: number = 128;

    public getMetrics(): { rss: number; heapUsed: number; heapTotal: number; memoryThreshold: number } {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss / 1024 / 1024, // Convert to MB
            heapUsed: usage.heapUsed / 1024 / 1024,
            heapTotal: usage.heapTotal / 1024 / 1024,
            memoryThreshold: this.memoryThreshold
        };
    }

    public setMemoryThreshold(threshold: number): void {
        this.memoryThreshold = threshold;
    }

    public getMemoryThreshold(): number {
        return this.memoryThreshold;
    }
} 