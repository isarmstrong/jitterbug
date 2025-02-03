import { LogEntry, LogTransport, Runtime } from "../types";
import { BaseTransport, TransportConfig } from "./types";

export interface HydrationMetrics {
    // Hydration Events
    hydrationAttempts: number;
    hydrationErrors: number;
    suspenseBoundaryUpdates: number;
    serverComponentRenders: number;
    streamingUpdates: number;

    // Timing
    avgHydrationTime: number;
    avgServerRenderTime: number;
    avgStreamingDelay: number;

    // Mismatches
    contentMismatches: number;
    attributeMismatches: number;
    suspenseMismatches: number;
    lastMismatchTime: number | null;

    // Component Stats
    componentHydrationMap: Map<string, {
        attempts: number;
        errors: number;
        avgTime: number;
    }>;
}

export interface HydrationConfig extends TransportConfig {
    trackComponents?: boolean;
    maxComponentHistory?: number;
}

interface HydrationEvent {
    type: 'hydration' | 'server' | 'streaming' | 'suspense' | 'mismatch';
    component?: string;
    duration: number;
    timestamp: number;
    error?: Error;
    mismatchType?: 'content' | 'attribute' | 'suspense';
    details?: Record<string, unknown>;
}

export class HydrationTransport extends BaseTransport implements LogTransport {
    private metrics: HydrationMetrics = {
        hydrationAttempts: 0,
        hydrationErrors: 0,
        suspenseBoundaryUpdates: 0,
        serverComponentRenders: 0,
        streamingUpdates: 0,
        avgHydrationTime: 0,
        avgServerRenderTime: 0,
        avgStreamingDelay: 0,
        contentMismatches: 0,
        attributeMismatches: 0,
        suspenseMismatches: 0,
        lastMismatchTime: null,
        componentHydrationMap: new Map()
    };

    private hydrationTimes: number[] = [];
    private serverRenderTimes: number[] = [];
    private streamingDelays: number[] = [];
    private readonly trackComponents: boolean;
    private readonly maxComponentHistory: number;

    constructor(config?: HydrationConfig) {
        super(config);
        this.trackComponents = config?.trackComponents ?? true;
        this.maxComponentHistory = config?.maxComponentHistory ?? 1000;
    }

    public async write<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): Promise<void> {
        // Only process hydration-related entries
        if (!this.isHydrationEntry(entry)) {
            return Promise.resolve();
        }

        const event = this.parseHydrationEvent(entry);
        if (!event) return Promise.resolve();

        this.processHydrationEvent(event);
        return Promise.resolve();
    }

    public getMetrics(): Readonly<HydrationMetrics> {
        return Object.freeze({
            ...this.metrics,
            componentHydrationMap: new Map(this.metrics.componentHydrationMap)
        });
    }

    private isHydrationEntry<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): boolean {
        return (
            entry.context?.runtime === Runtime.BROWSER &&
            (entry as any).data?.type === 'hydration'
        );
    }

    private parseHydrationEvent<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): HydrationEvent | null {
        const data = (entry as any).data as Record<string, unknown>;

        if (!data.eventType || typeof data.eventType !== 'string') {
            return null;
        }

        return {
            type: data.eventType as HydrationEvent['type'],
            component: data.component as string | undefined,
            duration: typeof data.duration === 'number' ? data.duration : 0,
            timestamp: new Date(Number(entry.context?.timestamp ?? 0)).getTime(),
            error: data.error as Error | undefined,
            mismatchType: data.mismatchType as HydrationEvent['mismatchType'],
            details: data.details as Record<string, unknown> | undefined
        };
    }

    private processHydrationEvent(event: HydrationEvent): void {
        switch (event.type) {
            case 'hydration':
                this.processHydrationAttempt(event);
                break;
            case 'server':
                this.processServerRender(event);
                break;
            case 'streaming':
                this.processStreamingUpdate(event);
                break;
            case 'suspense':
                this.processSuspenseUpdate(event);
                break;
            case 'mismatch':
                this.processMismatch(event);
                break;
        }

        if (this.trackComponents && event.component) {
            this.updateComponentMetrics(event);
        }
    }

    private processHydrationAttempt(event: HydrationEvent): void {
        this.metrics.hydrationAttempts++;
        if (event.error) {
            this.metrics.hydrationErrors++;
        }

        this.hydrationTimes.push(event.duration);
        if (this.hydrationTimes.length > 100) {
            this.hydrationTimes.shift();
        }
        this.metrics.avgHydrationTime =
            this.hydrationTimes.reduce((a, b) => a + b, 0) / this.hydrationTimes.length;
    }

    private processServerRender(event: HydrationEvent): void {
        this.metrics.serverComponentRenders++;
        this.serverRenderTimes.push(event.duration);
        if (this.serverRenderTimes.length > 100) {
            this.serverRenderTimes.shift();
        }
        this.metrics.avgServerRenderTime =
            this.serverRenderTimes.reduce((a, b) => a + b, 0) / this.serverRenderTimes.length;
    }

    private processStreamingUpdate(event: HydrationEvent): void {
        this.metrics.streamingUpdates++;
        this.streamingDelays.push(event.duration);
        if (this.streamingDelays.length > 100) {
            this.streamingDelays.shift();
        }
        this.metrics.avgStreamingDelay =
            this.streamingDelays.reduce((a, b) => a + b, 0) / this.streamingDelays.length;
    }

    private processSuspenseUpdate(event: HydrationEvent): void {
        this.metrics.suspenseBoundaryUpdates++;
    }

    private processMismatch(event: HydrationEvent): void {
        if (event.mismatchType === 'content') {
            this.metrics.contentMismatches++;
        } else if (event.mismatchType === 'attribute') {
            this.metrics.attributeMismatches++;
        } else if (event.mismatchType === 'suspense') {
            this.metrics.suspenseMismatches++;
        }
        this.metrics.lastMismatchTime = event.timestamp;
    }

    private updateComponentMetrics(event: HydrationEvent): void {
        if (!event.component) return;

        const stats = this.metrics.componentHydrationMap.get(event.component) ?? {
            attempts: 0,
            errors: 0,
            avgTime: 0
        };

        stats.attempts++;
        if (event.error) {
            stats.errors++;
        }

        // Update average time using moving average
        stats.avgTime = (stats.avgTime * (stats.attempts - 1) + event.duration) / stats.attempts;

        this.metrics.componentHydrationMap.set(event.component, stats);

        // Enforce component history limit
        if (this.metrics.componentHydrationMap.size > this.maxComponentHistory) {
            const oldestComponent = Array.from(this.metrics.componentHydrationMap.keys())[0];
            this.metrics.componentHydrationMap.delete(oldestComponent);
        }
    }
} 