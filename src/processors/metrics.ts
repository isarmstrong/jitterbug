import type { LogEntry, LogProcessor } from "../types/core";
import { Runtime, Environment } from "../types/enums";

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

export class MetricsProcessor implements LogProcessor {
  private lastCheck: number = 0;
  private readonly interval: number;

  constructor(interval: number = 1000) {
    this.interval = interval;
  }

  public supports(runtime: string): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  public allowedIn(environment: string): boolean {
    return environment !== Environment.TEST;
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    const now = Date.now();
    if (now - this.lastCheck < this.interval) {
      return entry;
    }

    this.lastCheck = now;
    const metrics = await this.collectMetrics();

    return {
      level: entry.level,
      message: entry.message,
      data: {
        ...(entry.data as Record<string, unknown>),
        metrics
      },
      error: entry.error,
      context: entry.context
    };
  }

  private async collectMetrics(): Promise<MetricsData> {
    const start = performance.now();
    const memory = this.getMemoryMetrics();
    const cpu = this.getCPUMetrics();
    const duration = performance.now() - start;

    return {
      timestamp: Date.now(),
      duration,
      memory,
      cpu
    };
  }

  private getMemoryMetrics() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const { heapUsed, heapTotal, external } = process.memoryUsage();
      return { heapUsed, heapTotal, external };
    }

    if (typeof performance !== "undefined" && performance.memory) {
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

  private getCPUMetrics() {
    if (typeof process !== "undefined" && process.cpuUsage) {
      const { user, system } = process.cpuUsage();
      return { user, system };
    }

    return {
      user: 0,
      system: 0
    };
  }
}
