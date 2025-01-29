import { Environment, Runtime } from '@isarmstrong/jitterbug';
import type { RuntimeType, EnvironmentType } from '@isarmstrong/jitterbug';
import type { LogType, LogContext } from '../types';

interface MetricsContext extends LogContext {
    metrics: {
        samples: number;
        eventLoop?: {
            lag: number;
            samples: number;
        };
        memoryUsage?: {
            heapUsed: number;
            heapTotal: number;
            external: number;
        };
    };
}

export interface LogProcessor {
    supports(runtime: RuntimeType): boolean;
    allowedIn(environment: EnvironmentType): boolean;
    process(entry: LogType): Promise<LogType>;
    cleanup(): void;
}

export class MetricsProcessor implements LogProcessor {
    private samples = 0;
    private eventLoopTimer: ReturnType<typeof setInterval> | null = null;
    private lastEventLoopTime = 0;
    private eventLoopLag = 0;
    private eventLoopSamples = 0;

    constructor() {
        if (typeof process !== 'undefined') {
            this.startEventLoopMonitoring();
        }
    }

    supports(runtime: RuntimeType): boolean {
        return runtime === Runtime.EDGE || runtime === Runtime.NODE;
    }

    allowedIn(environment: EnvironmentType): boolean {
        return environment === Environment.DEVELOPMENT || environment === Environment.PRODUCTION;
    }

    private startEventLoopMonitoring() {
        if (this.eventLoopTimer) return;

        const interval = 100;
        this.lastEventLoopTime = Date.now();

        this.eventLoopTimer = setInterval(() => {
            const now = Date.now();
            const delta = now - this.lastEventLoopTime;
            this.eventLoopLag = Math.max(0, delta - interval);
            this.eventLoopSamples++;
            this.lastEventLoopTime = now;
        }, interval);

        if (this.eventLoopTimer.unref) {
            this.eventLoopTimer.unref();
        }
    }

    private getEventLoopMetrics() {
        if (!this.eventLoopTimer) return undefined;

        return {
            lag: this.eventLoopLag,
            samples: this.eventLoopSamples
        };
    }

    private getMemoryMetrics() {
        if (typeof process === 'undefined' || !process.memoryUsage) {
            return undefined;
        }

        const { heapUsed, heapTotal, external } = process.memoryUsage();
        return { heapUsed, heapTotal, external };
    }

    private getMetrics() {
        this.samples++;

        const eventLoop = this.getEventLoopMetrics();
        const memoryUsage = this.getMemoryMetrics();

        return {
            samples: this.samples,
            eventLoop,
            memoryUsage
        };
    }

    async process(entry: LogType): Promise<LogType> {
        const metrics = this.getMetrics();
        const context = {
            ...entry.context,
            metrics
        } as MetricsContext;

        return {
            ...entry,
            context
        };
    }

    cleanup() {
        if (this.eventLoopTimer) {
            clearInterval(this.eventLoopTimer);
            this.eventLoopTimer = null;
        }
    }
} 