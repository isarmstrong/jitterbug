import { LogEntry, LogProcessor } from '../types/types.js';
import { Environment, Runtime } from '../types/enums.js';

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
  };
}

interface MetricsProcessorOptions {
  sampleRate?: number;
  trackMemory?: boolean;
  trackEventLoop?: boolean;
}

export class MetricsProcessor implements LogProcessor {
  private lastSampleTime = 0;
  private warningCount = 0;
  private readonly sampleRate: number;
  private readonly trackMemory: boolean;
  private readonly trackEventLoop: boolean;

  constructor(options: MetricsProcessorOptions = {}) {
    this.sampleRate = options.sampleRate ?? 1000; // Sample every second by default
    this.trackMemory = options.trackMemory ?? true;
    this.trackEventLoop = options.trackEventLoop ?? true;
  }

  public supports(runtime: "EDGE" | "NODE" | "BROWSER"): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  public allowedIn(environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION" | "TEST"): boolean {
    return environment !== Environment.TEST;
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T & MetricsData>> {
    const now = Date.now();
    const shouldSample = now - this.lastSampleTime >= this.sampleRate;

    if (!shouldSample) {
      return {
        ...entry,
        data: {
          ...entry.data,
        } as T & MetricsData,
      };
    }

    this.lastSampleTime = now;
    const metricsData: MetricsData = {
      timestamp: now,
    };

    const warnings: string[] = [];

    if (this.trackMemory) {
      const memoryMetrics = await this.getMemoryMetrics();
      if (memoryMetrics) {
        metricsData.memoryUsage = memoryMetrics;
        if (memoryMetrics.heapUsed / memoryMetrics.heapTotal > 0.9) {
          warnings.push(`High memory usage: ${Math.round(memoryMetrics.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryMetrics.heapTotal / 1024 / 1024)}MB`);
          this.warningCount++;
        }
      }
    }

    if (this.trackEventLoop) {
      const lag = await this.getEventLoopLag();
      if (lag !== undefined) {
        metricsData.eventLoop = { lag };
        if (lag > 50) {
          warnings.push(`High event loop lag: ${lag}ms`);
        }
      }
    }

    return {
      ...entry,
      data: {
        ...entry.data,
        ...metricsData,
      } as T & MetricsData,
      warnings: [...(entry.warnings || []), ...warnings],
    };
  }

  private getMemoryMetrics(): Promise<MetricsData['memoryUsage'] | undefined> {
    try {
      const memoryUsage = process.memoryUsage();
      return Promise.resolve({
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
      });
    } catch {
      // process.memoryUsage() might not be available in Edge runtime
      return Promise.resolve(undefined);
    }
  }

  private async getEventLoopLag(): Promise<number | undefined> {
    if (!this.trackEventLoop) return undefined;

    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1));
    const end = Date.now();
    const lag = end - start - 1; // Subtract minimum timer resolution (1ms)
    return Math.max(0, lag);
  }

  public getWarningCount(): number {
    return this.warningCount;
  }
}
