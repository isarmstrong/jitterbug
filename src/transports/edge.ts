/// <reference lib="dom" />

import pThrottle from "p-throttle";
import { EDGE_DEFAULTS } from '../config/defaults';
import { LogEntry, LogLevel, LogLevels, LogTransport } from "../types";
import { MemoryMetrics, MemoryUnit } from '../types/ebl/memory';
import { Storage } from '../utils/storage';
import { BaseTransport, TransportConfig } from './types';

export interface EdgeTransportConfig extends TransportConfig {
  endpoint: string;
  bufferSize?: number;
  maxEntries?: number;
  retryInterval?: number;
  maxRetries?: number;
  maxConnectionDuration?: number;
  maxPayloadSize?: number;
  autoReconnect?: boolean;
  maxConcurrent?: number;
  requestsPerSecond?: number;
  batchSize?: number;
  flushInterval?: number;
  persistQueue?: boolean;
  testMode?: boolean;
  memoryThreshold?: number;
  level?: LogLevel;
}

interface StreamMetrics {
  messageCount: number;
  avgProcessingTime: number;
  backpressureEvents: number;
  lastBackpressureTime: number;
  errorCount: number;
  lastErrorTime: number;
  bufferSize: number;
  bufferUsage: number;
  droppedMessages: number;
  lastDropTime: number;
  memoryUsage: MemoryMetrics;
  debugMetrics: {
    droppedEntries: number;
    highWaterMark: number;
    lowWaterMark: number;
    lastPressureLevel: number;
  };
}

interface BatchMetrics {
  size: number;
  entryCount: number;
  processingTime: number;
  retryCount: number;
  success: boolean;
}

export class EdgeTransport extends BaseTransport implements LogTransport {
  protected override config!: Required<EdgeTransportConfig>;
  private queue: LogEntry[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private retryCount = 0;
  private updateCallbacks: Set<() => void> = new Set();
  private throttledSendPayload: (payload: string, batchId: string) => Promise<void>;
  private pendingRequests = 0;
  private readonly maxPendingRequests: number;
  private abortController: AbortController | null = null;
  private metrics: StreamMetrics = {
    messageCount: 0,
    avgProcessingTime: 0,
    backpressureEvents: 0,
    lastBackpressureTime: 0,
    errorCount: 0,
    lastErrorTime: 0,
    bufferSize: 0,
    bufferUsage: 0,
    droppedMessages: 0,
    lastDropTime: 0,
    memoryUsage: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      threshold: 0,
      rss: 0
    },
    debugMetrics: {
      droppedEntries: 0,
      highWaterMark: 90,
      lowWaterMark: 70,
      lastPressureLevel: 0
    }
  };
  private processingTimes: number[] = [];
  private isFlushing = false;
  private flushMutex = new Int32Array(new SharedArrayBuffer(4));
  private batchMetrics: Map<string, BatchMetrics> = new Map();
  private lastMemoryCheck = 0;
  private readonly MEMORY_CHECK_INTERVAL = 30000; // 30 seconds
  private flushLock = false;
  private _memoryThreshold: number;
  private storage: Storage;

  /**
   * Get the current connection state
   */
  public get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get current stream metrics
   */
  public getMetrics(): Readonly<StreamMetrics> {
    return Object.freeze({ ...this.metrics });
  }

  constructor(config: EdgeTransportConfig) {
    super(config);
    this.config = {
      ...EDGE_DEFAULTS,
      enabled: true,
      level: config.level ?? LogLevels.INFO,
      format: config.format ?? "json",
      endpoint: config.endpoint,
      bufferSize: config.bufferSize ?? EDGE_DEFAULTS.bufferSize,
      maxEntries: config.maxEntries ?? EDGE_DEFAULTS.maxEntries,
      retryInterval: config.retryInterval ?? EDGE_DEFAULTS.retryInterval,
      maxRetries: config.maxRetries ?? EDGE_DEFAULTS.maxRetries,
      maxConnectionDuration: config.maxConnectionDuration ?? EDGE_DEFAULTS.maxConnectionDuration,
      maxPayloadSize: config.maxPayloadSize ?? EDGE_DEFAULTS.maxPayloadSize,
      autoReconnect: config.autoReconnect ?? EDGE_DEFAULTS.autoReconnect,
      maxConcurrent: config.maxConcurrent ?? EDGE_DEFAULTS.maxConcurrent,
      requestsPerSecond: config.requestsPerSecond ?? EDGE_DEFAULTS.requestsPerSecond,
      batchSize: config.batchSize ?? EDGE_DEFAULTS.batchSize,
      flushInterval: config.flushInterval ?? EDGE_DEFAULTS.flushInterval,
      persistQueue: config.persistQueue ?? false,
      testMode: config.testMode ?? EDGE_DEFAULTS.testMode,
      memoryThreshold: config.memoryThreshold ?? 128,
    };
    this._memoryThreshold = this.config.memoryThreshold;
    this.storage = new Storage();
    this.maxPendingRequests = this.config.maxConcurrent;

    // Use config to determine if we're in test mode
    if (this.config.testMode) {
      this.throttledSendPayload = (payload: string, batchId: string) => this.sendPayload(payload, batchId);
    } else {
      this.throttledSendPayload = pThrottle({
        limit: this.config.maxConcurrent,
        interval: 1000 / this.config.requestsPerSecond
      })((payload: string, batchId: string) => this.sendPayload(payload, batchId));
    }

    if (this.config.autoReconnect) {
      void this.connect().catch(console.error);
    }

    this.setupFlushInterval();
    this.startMemoryMonitoring();
  }

  private createFlushCallback(): () => Promise<void> {
    return async () => {
      await this.flushQueue();
    };
  }

  private async acquireFlushLock(): Promise<boolean> {
    if (this.flushLock) return false;
    this.flushLock = true;
    await this.flushQueue();
    this.flushLock = false;
    return true;
  }

  private async persistQueue(): Promise<void> {
    if (!this.queue.length) return;
    await this.storage.setItem('queue', this.queue);
  }

  private async restoreQueue(): Promise<void> {
    const storedQueue = await Promise.resolve(this.storage.getItem('queue'));
    if (Array.isArray(storedQueue)) {
      this.queue = storedQueue;
    }
  }

  private isMemoryExceeded(metrics: MemoryMetrics): boolean {
    return metrics.heapUsed > 0 && metrics.heapUsed >= this._memoryThreshold;
  }

  private async flushQueue(): Promise<void> {
    try {
      await this.persistQueue();
    } catch (error) {
      console.error('Failed to flush queue:', error);
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const payload = JSON.stringify(this.queue);
    this.queue = [];
    await fetch(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });
  }

  private async processBatch(batch: LogEntry[]): Promise<void> {
    // Implementation
  }

  private async sendPayload(payload: string, batchId: string): Promise<void> {
    if (!this._isConnected || this.pendingRequests >= this.maxPendingRequests) {
      return;
    }

    this.pendingRequests++;
    const batchMetrics = this.batchMetrics.get(batchId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Runtime": "edge",
          "X-Environment": "production",
          "X-Batch-ID": batchId,
          "X-Retry-Count": batchMetrics ? String(batchMetrics.retryCount) : "0"
        },
        body: payload,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to send payload: ${response.status}`);
      }

      if (batchMetrics) {
        batchMetrics.success = true;
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        try {
          const entries = JSON.parse(payload) as Array<LogEntry>;
          const existingIds = new Set(
            this.queue
              .map(e => e._metadata?.sequence)
              .filter((seq): seq is number => seq !== undefined)
          );

          const newEntries = entries.filter(entry => {
            const sequence = entry._metadata?.sequence;
            return sequence === undefined || !existingIds.has(sequence);
          });

          this.queue = [...newEntries, ...this.queue]
            .slice(0, this.config.bufferSize);

          if (batchMetrics) {
            batchMetrics.retryCount++;
            batchMetrics.success = false;
          }
        } catch (parseError) {
          console.error('Failed to parse failed payload:', parseError);
        }
      }
      throw error;
    } finally {
      this.pendingRequests--;
      this.batchMetrics.delete(batchId);
    }
  }

  public async connect(): Promise<void> {
    if (this._isConnected) return;

    // Cancel any existing connection attempt
    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      // Validate endpoint with timeout
      const response = await Promise.race([
        fetch(this.config.endpoint, {
          method: "HEAD",
          headers: {
            "X-Runtime": "edge",
            "X-Environment": "production",
          },
          signal: this.abortController.signal
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        )
      ]);

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`);
      }

      this._isConnected = true;
      this.retryCount = 0;
      this.startFlushTimer();
    } catch (error) {
      // Don't handle aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      this._isConnected = false;
      this.metrics.errorCount++;
      this.metrics.lastErrorTime = Date.now();

      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        // Use exponential backoff
        const backoff = Math.min(
          this.config.retryInterval * Math.pow(2, this.retryCount - 1),
          30000 // Max 30 second delay
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.connect();
      }
      // Reset state on max retries
      this.retryCount = 0;
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  public async disconnect(): Promise<void> {
    this._isConnected = false;
    this.abortController?.abort();
    this.abortController = null;

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Flush any remaining entries
    if (this.queue.length > 0) {
      await this.flush();
    }
  }

  public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    const startTime = performance.now();

    if (!this._isConnected && this.config.autoReconnect) {
      await Promise.race([
        this.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]).catch(() => { });
    }

    const entrySize = JSON.stringify(entry).length;
    if (entrySize > this.config.maxPayloadSize) {
      throw new Error('Entry exceeds maximum payload size');
    }

    const immutableEntry = Object.freeze({
      ...entry,
      _metadata: {
        queueTime: Date.now(),
        sequence: this.metrics.messageCount++,
        _size: entrySize
      }
    });

    this.queue.push(immutableEntry);
    this.metrics.bufferUsage = this.queue.length / this.config.bufferSize;

    // Enforce buffer limits with circular buffer behavior
    if (this.queue.length > this.config.bufferSize) {
      this.queue = this.queue.slice(-this.config.bufferSize);
      this.metrics.backpressureEvents++;
      this.metrics.lastBackpressureTime = Date.now();
    }

    // Immediate flush if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      await this.flush().catch(() => { });
    }

    // Update performance metrics
    const processingTime = performance.now() - startTime;
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) this.processingTimes.shift();
    this.metrics.avgProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;

    this.notifyUpdate();
  }

  public getEntries(): ReadonlyArray<LogEntry<Record<string, unknown>>> {
    return Object.freeze([...this.queue]);
  }

  public onUpdate(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    // Return cleanup function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  private setupFlushInterval(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (!this._isConnected) return;

    this.flushTimeout = setTimeout(() => {
      void this.flush();
      if (this._isConnected) {
        this.setupFlushInterval();
      }
    }, this.config.flushInterval);
  }

  private startFlushTimer(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.setupFlushInterval();
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  public async destroy(): Promise<void> {
    this._isConnected = false;
    this.abortController?.abort();
    this.abortController = null;

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Modified flush handling
    if (this.queue.length > 0) {
      try {
        await this.flush();
      } catch (error) {
        console.error('Error flushing during destroy:', error);
      }
    }

    this.queue = [];
    this.updateCallbacks.clear();
  }

  private updateMetrics(): void {
    try {
      const memoryInfo = process.memoryUsage();

      this.metrics.memoryUsage = {
        heapUsed: memoryInfo.heapUsed / MemoryUnit.MB,
        heapTotal: memoryInfo.heapTotal / MemoryUnit.MB,
        external: memoryInfo.external / MemoryUnit.MB,
        arrayBuffers: 0, // Not available in standard Node.js memory usage
        threshold: EDGE_DEFAULTS.maxPayloadSize / MemoryUnit.MB,
        rss: memoryInfo.rss / MemoryUnit.MB
      };

      // Check for memory pressure
      if (this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal > 0.9) {
        this.onMemoryPressure();
      }
    } catch (error) {
      // Log error but don't throw to avoid crashing the transport
      console.error('Failed to update metrics:', error);
    }
  }

  private onMemoryPressure(): void {
    // Implement memory pressure handling
    this.flush();
    this.clearBuffer();
  }

  private clearBuffer(): void {
    this.queue = [];
    this.metrics.bufferUsage = 0;
  }

  private startMemoryMonitoring(): void {
    // Implementation
  }
}
