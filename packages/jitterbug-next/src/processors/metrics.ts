import type {
    EnvironmentType,
    LogEntry,
    LogProcessor,
    RuntimeType
} from '@isarmstrong/jitterbug/types/core';

interface MetricsData {
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
}

export const createMetricsProcessor = (): LogProcessor => {
    let lastCheck = Date.now();
    let eventLoopLag = 0;

    const checkEventLoop = () => {
        const now = Date.now();
        eventLoopLag = Math.max(0, now - lastCheck - 1000);
        lastCheck = now;
        setTimeout(checkEventLoop, 1000);
    };

    checkEventLoop();

    return {
        process: async <T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> => {
            const { memoryUsage } = process;
            const memory = memoryUsage();
            const context = entry.context;
            const currentMetrics = (context as any).metrics || {
                samples: 0,
                eventLoop: {
                    lag: 0,
                    samples: 0
                },
                memoryUsage: {
                    heapUsed: 0,
                    heapTotal: 0,
                    external: 0
                }
            };

            const metrics: MetricsData = { ...currentMetrics };
            metrics.samples++;
            metrics.eventLoop = {
                lag: (metrics.eventLoop?.lag || 0) + eventLoopLag,
                samples: (metrics.eventLoop?.samples || 0) + 1
            };

            if (memory) {
                metrics.memoryUsage = {
                    heapUsed: memory.heapUsed,
                    heapTotal: memory.heapTotal,
                    external: memory.external
                };
            }

            const newContext = {
                ...context,
                metrics
            };

            return {
                ...entry,
                context: newContext
            } as LogEntry<T>;
        },
        supports: (runtime: RuntimeType) => runtime === 'NODE',
        allowedIn: (environment: EnvironmentType) => true
    };
}; 