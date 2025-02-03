import { LogEntry, LogTransport } from "../types";
import { BaseTransport, TransportConfig } from "./types";

export interface ResourceMetrics {
    // Memory Metrics
    heapUsed: number;
    heapTotal: number;
    externalMemory: number;
    arrayBuffers: number;
    memoryTrend: number[]; // Last 100 heap measurements

    // Connection Metrics
    activeConnections: number;
    maxConnections: number;
    connectionErrors: number;
    avgResponseTime: number;
    connectionPoolUtilization: number;

    // Quota Usage
    quotaUsage: Map<string, {
        used: number;
        limit: number;
        lastReset: number;
    }>;

    // Edge Function Metrics
    coldStarts: number;
    warmStarts: number;
    avgColdStartTime: number;
    avgWarmStartTime: number;
    lastStartTime: number | null;
    executionTimePercentiles: {
        p50: number;
        p90: number;
        p99: number;
    };
}

export interface ResourceConfig extends TransportConfig {
    sampleInterval?: number;
    retentionPeriod?: number;
    quotaTypes?: string[];
}

interface ResourceSnapshot {
    timestamp: number;
    metrics: ResourceMetrics;
}

export class ResourceTransport extends BaseTransport implements LogTransport {
    private metrics: ResourceMetrics = {
        heapUsed: 0,
        heapTotal: 0,
        externalMemory: 0,
        arrayBuffers: 0,
        memoryTrend: [],
        activeConnections: 0,
        maxConnections: 0,
        connectionErrors: 0,
        avgResponseTime: 0,
        connectionPoolUtilization: 0,
        quotaUsage: new Map(),
        coldStarts: 0,
        warmStarts: 0,
        avgColdStartTime: 0,
        avgWarmStartTime: 0,
        lastStartTime: null,
        executionTimePercentiles: {
            p50: 0,
            p90: 0,
            p99: 0
        }
    };

    private snapshots: ResourceSnapshot[] = [];
    private responseTimes: number[] = [];
    private coldStartTimes: number[] = [];
    private warmStartTimes: number[] = [];
    private executionTimes: number[] = [];
    private sampleInterval: number;
    private retentionPeriod: number;
    private quotaTypes: Set<string>;
    private sampleTimer: NodeJS.Timeout | null = null;

    constructor(config?: ResourceConfig) {
        super(config);
        this.sampleInterval = config?.sampleInterval ?? 1000; // 1 second
        this.retentionPeriod = config?.retentionPeriod ?? 24 * 60 * 60 * 1000; // 24 hours
        this.quotaTypes = new Set(config?.quotaTypes ?? ['memory', 'cpu', 'requests', 'bandwidth']);

        this.startSampling();
    }

    public async write<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): Promise<void> {
        if (!this.isResourceEntry(entry)) {
            return Promise.resolve();
        }

        this.processResourceEvent(entry);
        return Promise.resolve();
    }

    public getMetrics(): Readonly<ResourceMetrics> {
        return Object.freeze({
            ...this.metrics,
            memoryTrend: [...this.metrics.memoryTrend],
            quotaUsage: new Map(this.metrics.quotaUsage)
        });
    }

    public getSnapshots(duration?: number): ReadonlyArray<ResourceSnapshot> {
        const cutoff = duration ? Date.now() - duration : 0;
        return this.snapshots
            .filter(snapshot => snapshot.timestamp >= cutoff)
            .map(snapshot => Object.freeze({ ...snapshot }));
    }

    private isResourceEntry<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): boolean {
        return (entry as any).data?.type === 'resource';
    }

    private processResourceEvent<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): void {
        const data = (entry as any).data as Record<string, unknown>;

        switch (data.eventType) {
            case 'connection':
                this.processConnectionEvent(data);
                break;
            case 'memory':
                this.processMemoryEvent(data);
                break;
            case 'quota':
                this.processQuotaEvent(data);
                break;
            case 'execution':
                this.processExecutionEvent(data);
                break;
        }
    }

    private processConnectionEvent(data: Record<string, unknown>): void {
        if (typeof data.activeConnections === 'number') {
            this.metrics.activeConnections = data.activeConnections;
        }
        if (typeof data.maxConnections === 'number') {
            this.metrics.maxConnections = data.maxConnections;
        }
        if (typeof data.responseTime === 'number') {
            this.responseTimes.push(data.responseTime);
            if (this.responseTimes.length > 1000) {
                this.responseTimes.shift();
            }
            this.metrics.avgResponseTime =
                this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
        }
        if (data.error) {
            this.metrics.connectionErrors++;
        }

        // Update pool utilization
        if (this.metrics.maxConnections > 0) {
            this.metrics.connectionPoolUtilization =
                this.metrics.activeConnections / this.metrics.maxConnections;
        }
    }

    private processMemoryEvent(data: Record<string, unknown>): void {
        if (typeof data.heapUsed === 'number') {
            this.metrics.heapUsed = data.heapUsed;
            this.metrics.memoryTrend.push(data.heapUsed);
            if (this.metrics.memoryTrend.length > 100) {
                this.metrics.memoryTrend.shift();
            }
        }
        if (typeof data.heapTotal === 'number') {
            this.metrics.heapTotal = data.heapTotal;
        }
        if (typeof data.external === 'number') {
            this.metrics.externalMemory = data.external;
        }
        if (typeof data.arrayBuffers === 'number') {
            this.metrics.arrayBuffers = data.arrayBuffers;
        }
    }

    private processQuotaEvent(data: Record<string, unknown>): void {
        if (
            typeof data.quotaType === 'string' &&
            this.quotaTypes.has(data.quotaType) &&
            typeof data.used === 'number' &&
            typeof data.limit === 'number'
        ) {
            this.metrics.quotaUsage.set(data.quotaType, {
                used: data.used,
                limit: data.limit,
                lastReset: Date.now()
            });
        }
    }

    private processExecutionEvent(data: Record<string, unknown>): void {
        const now = Date.now();
        this.metrics.lastStartTime = now;

        if (data.isColdStart === true) {
            this.metrics.coldStarts++;
            if (typeof data.startupTime === 'number') {
                this.coldStartTimes.push(data.startupTime);
                if (this.coldStartTimes.length > 100) {
                    this.coldStartTimes.shift();
                }
                this.metrics.avgColdStartTime =
                    this.coldStartTimes.reduce((a, b) => a + b, 0) / this.coldStartTimes.length;
            }
        } else {
            this.metrics.warmStarts++;
            if (typeof data.startupTime === 'number') {
                this.warmStartTimes.push(data.startupTime);
                if (this.warmStartTimes.length > 100) {
                    this.warmStartTimes.shift();
                }
                this.metrics.avgWarmStartTime =
                    this.warmStartTimes.reduce((a, b) => a + b, 0) / this.warmStartTimes.length;
            }
        }

        if (typeof data.executionTime === 'number') {
            this.executionTimes.push(data.executionTime);
            if (this.executionTimes.length > 1000) {
                this.executionTimes.shift();
            }
            this.updateExecutionPercentiles();
        }
    }

    private updateExecutionPercentiles(): void {
        const sorted = [...this.executionTimes].sort((a, b) => a - b);
        const len = sorted.length;

        this.metrics.executionTimePercentiles = {
            p50: sorted[Math.floor(len * 0.5)] ?? 0,
            p90: sorted[Math.floor(len * 0.9)] ?? 0,
            p99: sorted[Math.floor(len * 0.99)] ?? 0
        };
    }

    private startSampling(): void {
        if (this.sampleTimer) {
            clearInterval(this.sampleTimer);
        }

        this.sampleTimer = setInterval(() => {
            const snapshot: ResourceSnapshot = {
                timestamp: Date.now(),
                metrics: { ...this.metrics }
            };

            this.snapshots.push(snapshot);

            // Clean up old snapshots
            const cutoff = Date.now() - this.retentionPeriod;
            this.snapshots = this.snapshots.filter(s => s.timestamp >= cutoff);
        }, this.sampleInterval);
    }

    public async destroy(): Promise<void> {
        if (this.sampleTimer) {
            clearInterval(this.sampleTimer);
            this.sampleTimer = null;
        }
    }
} 