import { LogEntry, LogProcessor, Environment, Runtime, RuntimeType, EnvironmentType, LogLevel, LogContext } from "../types/core";

interface MetricsData {
  timestamp: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  eventLoop?: {
    lag: number;
    samples: number;
  };
  samples: number;
}

interface MetricsProcessorOptions {
  sampleRate?: number;
  trackMemory?: boolean;
  trackEventLoop?: boolean;
}

export class MetricsProcessor implements LogProcessor {
  private lastSampleTime = 0;
  private warningCount = 0;
  private samples = 0;
  private eventLoopSamples = 0;
  private readonly sampleRate: number;
  private readonly trackMemory: boolean;
  private readonly trackEventLoop: boolean;
  private metrics: MetricsData;

  constructor(options: MetricsProcessorOptions = {}) {
    this.sampleRate = options.sampleRate ?? 1000; // Sample every second by default
    this.trackMemory = options.trackMemory ?? true;
    this.trackEventLoop = options.trackEventLoop ?? true;
    this.metrics = {
      timestamp: Date.now(),
      samples: 0,
      eventLoop: {
        lag: 0,
        samples: 0
      }
    };
  }

  public supports(runtime: RuntimeType): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  public allowedIn(environment: EnvironmentType): boolean {
    return environment !== Environment.TEST;
  }

  public async collect(): Promise<MetricsData> {
    const now = Date.now();
    const shouldSample = now - this.lastSampleTime >= this.sampleRate;

    if (!shouldSample) {
      return this.metrics;
    }

    this.lastSampleTime = now;
    this.samples++;

    if (this.trackMemory) {
      const memoryMetrics = await this.getMemoryMetrics();
      if (memoryMetrics) {
        this.metrics.memoryUsage = memoryMetrics;
      }
    }

    if (this.trackEventLoop) {
      const lag = await this.getEventLoopLag();
      if (lag !== undefined) {
        this.eventLoopSamples++;
        this.metrics.eventLoop = {
          lag,
          samples: this.eventLoopSamples
        };
      }
    }

    this.metrics.timestamp = now;
    this.metrics.samples = this.samples;

    return this.metrics;
  }

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>
  ): Promise<LogEntry<T>> {
    const metrics = await this.collect();
    const warnings: string[] = [];

    // Check for warnings after collection
    if (this.metrics.memoryUsage && this.metrics.memoryUsage.heapUsed > 0.8 * this.metrics.memoryUsage.heapTotal) {
      warnings.push(
        `High memory usage: ${Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(this.metrics.memoryUsage.heapTotal / 1024 / 1024)}MB`,
      );
      this.warningCount++;
    }

    if (this.metrics.eventLoop?.lag && this.metrics.eventLoop.lag > 50) {
      warnings.push(`High event loop lag: ${this.metrics.eventLoop.lag}ms`);
    }

    // Create a new entry that preserves the original type T while adding metrics
    const processedEntry: LogEntry<T> = {
      level: entry.level,
      message: entry.message,
      data: entry.data,
      error: entry.error,
      context: {
        ...entry.context,
        metrics // Add metrics to the context since LogContext allows additional properties via index signature
      }
    };

    // Only add warnings if there are any
    if (warnings.length > 0) {
      processedEntry.warnings = warnings;
    }

    return processedEntry;
  }

  private async getMemoryMetrics(): Promise<MetricsData["memoryUsage"] | undefined> {
    try {
      const memoryUsage = process.memoryUsage();
      return {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
      };
    } catch {
      return undefined;
    }
  }

  private async getEventLoopLag(): Promise<number | undefined> {
    try {
      const start = performance.now();
      await new Promise(resolve => setImmediate(resolve));
      const end = performance.now();
      return Math.max(0, end - start);
    } catch {
      return undefined;
    }
  }

  public getMetrics(): MetricsData {
    return { ...this.metrics };
  }

  public getWarningCount(): number {
    return this.warningCount;
  }
}
