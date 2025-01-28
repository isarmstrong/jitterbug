import { Environment, Runtime, LogLevels } from '@isarmstrong/jitterbug';
import type {
    LogEntry,
    LogProcessor,
    ProcessedLogEntry,
    BaseLogContext,
    RuntimeType,
    EnvironmentType,
    LogLevel
} from '@isarmstrong/jitterbug';

interface MetricsContext extends BaseLogContext {
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

export class MetricsProcessor implements LogProcessor {
    private samples = 0;
    private lastEventLoopCheck = process.hrtime.bigint();

    public supports(runtime: RuntimeType): boolean {
        return runtime === Runtime.EDGE || runtime === Runtime.NODE;
    }

    public allowedIn(environment: EnvironmentType): boolean {
        return environment === Environment.DEVELOPMENT || environment === Environment.PRODUCTION;
    }

    private getEventLoopLag(): number {
        const now = process.hrtime.bigint();
        const lag = Number((now - this.lastEventLoopCheck) / BigInt(1000000)); // Convert to ms
        this.lastEventLoopCheck = now;
        return lag;
    }

    private getMemoryUsage(): MetricsContext['metrics']['memoryUsage'] | undefined {
        try {
            const usage = process.memoryUsage();
            return {
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                external: usage.external
            };
        } catch {
            // Memory usage not available (e.g., in Edge Runtime)
            return undefined;
        }
    }

    private normalizeLogLevel(level: string): LogLevel {
        const upperLevel = level.toUpperCase() as keyof typeof LogLevels;
        if (upperLevel in LogLevels) {
            return LogLevels[upperLevel];
        }
        return LogLevels.INFO; // Default to INFO if invalid
    }

    public async process<T extends Record<string, unknown>>(
        entry: LogEntry<T & BaseLogContext>
    ): Promise<ProcessedLogEntry<T & MetricsContext>> {
        this.samples++;

        const metrics: MetricsContext['metrics'] = {
            samples: this.samples,
            eventLoop: {
                lag: this.getEventLoopLag(),
                samples: this.samples
            }
        };

        const memoryUsage = this.getMemoryUsage();
        if (memoryUsage) {
            metrics.memoryUsage = memoryUsage;
        }

        const baseContext = entry.context || {} as T & BaseLogContext;
        const updatedContext = {
            ...baseContext,
            metrics
        };

        const processedEntry: ProcessedLogEntry<T & MetricsContext> = {
            message: entry.message,
            level: this.normalizeLogLevel(entry.level),
            context: updatedContext as T & MetricsContext,
            processed: true
        };

        return processedEntry;
    }
} 