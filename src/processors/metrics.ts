import type { LogEntry, LogProcessor } from "../types/core";
import { Runtime, Environment } from "../types/enums";
import type { RuntimeType, EnvironmentType } from "../types/enums";
import { isRuntimeType, isEnvironmentType } from "../types/guards";

interface MetricsData {
  timestamp: number;
  duration: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
}

/**
 * Processor that collects system metrics at specified intervals.
 * Uses type-safe runtime detection and proper async boundaries.
 */
export class MetricsProcessor implements LogProcessor {
  private lastCheck: number = 0;
  private readonly interval: number;
  private metricsPromise: Promise<MetricsData> | null = null;

  constructor(interval: number = 1000) {
    this.interval = interval;
  }

  public supports(runtime: unknown): runtime is RuntimeType {
    return isRuntimeType(runtime) && (runtime === Runtime.NODE || runtime === Runtime.EDGE);
  }

  public allowedIn(environment: unknown): environment is EnvironmentType {
    return isEnvironmentType(environment) && environment !== Environment.TEST;
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    const now = Date.now();
    if (now - this.lastCheck < this.interval) {
      return entry;
    }

    this.lastCheck = now;

    // Reuse in-flight metrics collection if one exists
    if (!this.metricsPromise) {
      this.metricsPromise = this.collectMetrics().finally(() => {
        this.metricsPromise = null;
      });
    }

    const metrics = await this.metricsPromise;

    return {
      ...entry,
      data: {
        ...(entry.data as Record<string, unknown>),
        metrics
      }
    };
  }

  private async collectMetrics(): Promise<MetricsData> {
    const start = performance.now();

    // Collect metrics concurrently
    const [memory, cpu] = await Promise.all([
      this.getMemoryMetricsAsync(),
      this.getCPUMetricsAsync()
    ]);

    const duration = performance.now() - start;

    return {
      timestamp: Date.now(),
      duration,
      memory,
      cpu
    };
  }

  private async getMemoryMetricsAsync(): Promise<MetricsData['memory']> {
    // Ensure consistent async context
    await Promise.resolve();

    if (typeof process === "object" && process !== null && typeof process.memoryUsage === "function") {
      const { heapUsed, heapTotal, external } = process.memoryUsage();
      return { heapUsed, heapTotal, external };
    }

    if (typeof performance === "object" &&
      performance !== null &&
      typeof performance.memory === "object" &&
      performance.memory !== null) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      return {
        heapUsed: usedJSHeapSize,
        heapTotal: totalJSHeapSize,
        external: 0
      };
    }

    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0
    };
  }

  private async getCPUMetricsAsync(): Promise<MetricsData['cpu']> {
    // Ensure consistent async context
    await Promise.resolve();

    if (typeof process === "object" &&
      process !== null &&
      typeof process.cpuUsage === "function") {
      const { user, system } = process.cpuUsage();
      return { user, system };
    }

    return {
      user: 0,
      system: 0
    };
  }
}
