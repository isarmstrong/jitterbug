import { LogEntry, LogTransport, Runtime } from "../types/core";
import {
    BaseTransport,
    HydrationConfig,
    HydrationEvent,
    HydrationMetrics,
    TransportErrorCode
} from "../types/transports";

export type { HydrationConfig };

export class HydrationTransport extends BaseTransport implements LogTransport {
    protected override config!: Required<HydrationConfig>;

    private metrics: HydrationMetrics = {
        messageCount: 0,
        avgProcessingTime: 0,
        errorCount: 0,
        lastErrorTime: 0,
        bufferSize: 0,
        bufferUsage: 0,
        memoryUsage: {
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
            arrayBuffers: 0,
            threshold: 0,
            rss: 0
        },
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
        super(config ?? {});
        this.trackComponents = config?.trackComponents ?? true;
        this.maxComponentHistory = config?.maxComponentHistory ?? 1000;
    }

    public async write<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): Promise<void> {
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
            typeof entry.data === 'object' &&
            entry.data !== null &&
            'type' in entry.data &&
            entry.data.type === 'hydration'
        );
    }

    private parseHydrationEvent<T extends Record<string, unknown>>(
        entry: LogEntry<T>
    ): HydrationEvent | null {
        const data = entry.data as Record<string, unknown>;

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
            details: data.details as Record<string, unknown> | undefined,
            data: data
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

    private processSuspenseUpdate(_event: HydrationEvent): void {
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

    protected onError(_event: Event): void {
        // Handle error events
        if (_event instanceof ErrorEvent) {
            this.metrics.errorCount++;
            this.metrics.lastErrorTime = Date.now();
        }
    }

    protected handleError(error: Error, code: TransportErrorCode): void {
        this.config.errorHandler({
            code,
            message: error.message,
            name: error.name
        });
    }

    private validateString(value: string | null | undefined): string | null {
        return value?.trim() || null;
    }
} 