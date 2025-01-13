import type {
  LogEntry,
  LogProcessor,
  RuntimeType,
  EnvironmentType,
} from "../types/types";
import { Runtime, Environment } from "../types/enums";

/**
 * Metrics processor configuration
 */
export interface MetricsConfig {
  flushInterval?: number;
  maxMetrics?: number;
}

/**
 * Metrics data interface
 */
export interface MetricsData {
  duration?: number;
  timestamp: number;
}

/**
 * Metrics processor implementation
 */
export class MetricsProcessor implements LogProcessor {
  private readonly config: Required<MetricsConfig>;
  private metrics: Map<
    string,
    {
      count: number;
      totalDuration: number;
      lastTimestamp: number;
    }
  > = new Map();

  constructor(config?: MetricsConfig) {
    this.config = {
      flushInterval: config?.flushInterval ?? 60000, // 1 minute
      maxMetrics: config?.maxMetrics ?? 1000,
    };

    // Set up periodic flushing
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.flush(), this.config.flushInterval);
    }
  }

  supports(runtime: RuntimeType): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  allowedIn(environment: EnvironmentType): boolean {
    return environment !== Environment.TEST;
  }

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T & MetricsData>> {
    const namespace = entry.context.namespace;
    const timestamp = Date.now();

    let metric = this.metrics.get(namespace);
    if (!metric) {
      if (this.metrics.size >= this.config.maxMetrics) {
        // Remove oldest metric if we've reached the limit
        const oldestKey = Array.from(this.metrics.entries()).reduce((a, b) =>
          a[1].lastTimestamp < b[1].lastTimestamp ? a : b,
        )[0];
        this.metrics.delete(oldestKey);
      }

      metric = {
        count: 0,
        totalDuration: 0,
        lastTimestamp: timestamp,
      };
      this.metrics.set(namespace, metric);
    }

    const duration = timestamp - metric.lastTimestamp;
    metric.count++;
    metric.totalDuration += duration;
    metric.lastTimestamp = timestamp;

    return {
      ...entry,
      data: {
        ...entry.data,
        duration,
        timestamp,
      },
    } as LogEntry<T & MetricsData>;
  }

  private flush(): void {
    // Implement metric flushing logic here
    // This could send metrics to a monitoring system
    this.metrics.clear();
  }
}
