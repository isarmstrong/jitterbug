import {
  LogProcessor,
  LogEntry,
  RuntimeType,
} from "../types/types.js";
import { Runtime, LogLevels } from "../types/enums.js";

interface MetricsConfig {
  sampleRate?: number;
  memoryWarningThreshold?: number;
  eventLoopWarningThreshold?: number;
  trackMemory?: boolean;
  trackEventLoop?: boolean;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss?: number;
  external?: number;
}

interface EventLoopMetrics {
  lag: number;
}

interface MetricsData extends Record<string, unknown> {
  timestamp: number;
  memoryUsage?: MemoryMetrics;
  eventLoop?: EventLoopMetrics;
}

interface BrowserPerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}

interface ExtendedPerformance extends Performance {
  memory?: BrowserPerformanceMemory;
}

export class MetricsProcessor implements LogProcessor {
  private readonly config: Required<MetricsConfig>;
  private lastEventLoopCheck: number;
  private runtime: RuntimeType;
  private lastSampleTime: number;
  private warningCount: number;

  constructor(config: MetricsConfig = {}, runtime: RuntimeType = Runtime.NODE) {
    this.config = {
      sampleRate: config.sampleRate ?? 1,
      memoryWarningThreshold: config.memoryWarningThreshold ?? 0.9,
      eventLoopWarningThreshold: config.eventLoopWarningThreshold ?? 100,
      trackMemory: config.trackMemory ?? true,
      trackEventLoop: config.trackEventLoop ?? true,
    };
    this.lastEventLoopCheck = Date.now();
    this.lastSampleTime = 0; // Initialize to 0 to ensure first sample is taken
    this.runtime = runtime;
    this.warningCount = 0;
  }

  public supports(_runtime: string): boolean {
    return true; // Supports all runtimes
  }

  public allowedIn(_environment: string): boolean {
    return true; // Allowed in all environments
  }

  public get severity(): string {
    return LogLevels.INFO;
  }

  public setRuntime(runtime: RuntimeType): void {
    this.runtime = runtime;
  }

  private shouldSample(): boolean {
    const now = Date.now();
    const timeSinceLastSample = now - this.lastSampleTime;
    const sampleInterval = 1000 / this.config.sampleRate;

    if (timeSinceLastSample >= sampleInterval) {
      this.lastSampleTime = now;
      return true;
    }

    return false;
  }

  private getMemoryMetrics(): MemoryMetrics | undefined {
    if (!this.config.trackMemory) return undefined;

    if (this.runtime === Runtime.NODE && typeof process !== "undefined") {
      const memory = process.memoryUsage();
      return {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
      };
    } else if (
      this.runtime === Runtime.BROWSER &&
      typeof performance !== "undefined" &&
      "memory" in performance
    ) {
      const browserPerformance = performance as ExtendedPerformance;
      const memory = browserPerformance.memory;
      if (memory) {
        return {
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
        };
      }
    } else if (this.runtime === Runtime.EDGE) {
      // For Edge runtime, we'll use a more basic memory tracking
      const memory = process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 };
      return {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      };
    }

    return undefined;
  }

  private checkMemoryWarning(metrics: MemoryMetrics): string | undefined {
    if (!this.config.trackMemory) return undefined;

    const usedRatio = metrics.heapUsed / metrics.heapTotal;
    if (usedRatio > this.config.memoryWarningThreshold) {
      this.warningCount++;
      return `High memory usage: ${Math.round(usedRatio * 100)}% of heap used`;
    }

    return undefined;
  }

  private getEventLoopLag(): number {
    const now = Date.now();
    const lag = Math.max(0, now - this.lastEventLoopCheck - 1); // Subtract 1ms for minimum timer resolution
    this.lastEventLoopCheck = now;
    return lag;
  }

  private checkEventLoopWarning(lag: number): string | undefined {
    if (!this.config.trackEventLoop) return undefined;

    if (lag > this.config.eventLoopWarningThreshold) {
      return `High event loop lag: ${lag}ms`;
    }

    return undefined;
  }

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T> & { warnings?: string[] },
  ): Promise<LogEntry<T & MetricsData>> {
    const now = Date.now();
    const metricsData: MetricsData = {
      timestamp: now,
    };

    // Apply sampling rate
    if (!this.shouldSample()) {
      return {
        ...entry,
        data: {
          ...entry.data,
          timestamp: now,
        } as T & MetricsData,
      };
    }

    const newWarnings: string[] = [];

    if (this.config.trackMemory) {
      const memoryMetrics = this.getMemoryMetrics();
      if (memoryMetrics) {
        metricsData.memoryUsage = memoryMetrics;
        const warning = this.checkMemoryWarning(memoryMetrics);
        if (warning) newWarnings.push(warning);
      }
    }

    if (this.config.trackEventLoop) {
      const lag = this.getEventLoopLag();
      metricsData.eventLoop = { lag };
      const warning = this.checkEventLoopWarning(lag);
      if (warning) newWarnings.push(warning);
    }

    const baseResult = {
      ...entry,
      data: {
        ...entry.data,
        ...metricsData,
      } as T & MetricsData,
    };

    return {
      ...baseResult,
      warnings: newWarnings.length > 0
        ? [...(entry.warnings || []), ...newWarnings]
        : entry.warnings,
    } as LogEntry<T & MetricsData>;
  }

  public getWarningCount(): number {
    return this.warningCount;
  }
}
