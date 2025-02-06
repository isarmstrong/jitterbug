import type { LogEntry, Transport } from '@isarmstrong/jitterbug-core-types';

interface MetricsData {
    samples: number;
    eventLoop: {
        lag: number;
        samples: number;
    };
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
}

interface MetricsContext extends Record<string, unknown> {
    metrics?: MetricsData;
}

export const createMetricsProcessor = (): Transport => {
    let lastCheck = Date.now();

    const checkEventLoop = () => {
        const now = Date.now();
        const lag = Math.max(0, now - lastCheck - 1000);
        lastCheck = now;
        return lag;
    };

    checkEventLoop();

    return {
        write: async <T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> => {
            const { memoryUsage } = process;
            const memory = memoryUsage();
            const context = entry.context as MetricsContext;
            const currentMetrics = context.metrics || {
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
                lag: (metrics.eventLoop?.lag || 0) + checkEventLoop(),
                samples: (metrics.eventLoop?.samples || 0) + 1
            };

            if (memory) {
                metrics.memoryUsage = {
                    heapUsed: memory.heapUsed,
                    heapTotal: memory.heapTotal,
                    external: memory.external
                };
            }

            Object.assign(context, { metrics });
        }
    };
}; 