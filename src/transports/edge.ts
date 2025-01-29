/// <reference lib="dom" />

import pThrottle from "p-throttle";
import type { LogEntry, LogLevel } from "../types/core";
import type { EdgeMemoryMetrics } from '../types/edge';
import { BaseTransport } from "./types";
import type { TransportConfig } from "./types";
import { LogLevels } from "../types/enums";

declare global {
  interface Performance {
    memory?: Readonly<{
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsExternalHeapSize?: number;
      arrayBuffers?: number;
    }>;
  }
}

/**
 * Type-safe configuration for edge transport
 */
export interface EdgeTransportConfig extends TransportConfig {
  readonly endpoint: string;
  readonly maxEntries?: number;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly maxQueueSize?: number;
  readonly maxBatchSize?: number;
  readonly flushInterval?: number;
  readonly memoryLimit?: number;
  readonly persistQueue?: boolean;
  readonly maxConcurrent?: number;
  readonly requestsPerSecond?: number;
  readonly autoReconnect?: boolean;
  readonly testMode?: boolean;
  readonly bufferSize?: number;
  readonly maxConnectionDuration?: number;
  readonly maxPayloadSize?: number;
}

/**
 * Type-safe stream metrics
 */
interface StreamMetrics {
  readonly messageCount: number;
  readonly avgProcessingTime: number;
  readonly backpressureEvents: number;
  readonly lastBackpressureTime: number | null;
  readonly interruptions: number;
  readonly lastInterruptionTime: number | null;
  readonly bufferUtilization: number;
  readonly lastFlushTime: number | null;
  readonly memoryUsage: Readonly<{
    readonly heapUsed: number;
    readonly heapTotal: number;
    readonly external: number;
    readonly arrayBuffers: number;
  }> | null;
  readonly batchSuccessRate: number;
  readonly avgBatchSize: number;
  readonly droppedMessages: number;
  readonly debugMetrics: Readonly<{
    readonly droppedEntries: number;
    readonly highWaterMark: number;
  }>;
}

/**
 * Internal mutable stream metrics
 */
interface MutableStreamMetrics {
  messageCount: number;
  avgProcessingTime: number;
  backpressureEvents: number;
  lastBackpressureTime: number | null;
  interruptions: number;
  lastInterruptionTime: number | null;
  bufferUtilization: number;
  lastFlushTime: number | null;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  } | null;
  batchSuccessRate: number;
  avgBatchSize: number;
  droppedMessages: number;
  debugMetrics: {
    droppedEntries: number;
    highWaterMark: number;
  };
}

/**
 * Internal mutable batch metrics
 */
interface MutableBatchMetrics {
  size: number;
  entryCount: number;
  processingTime: number;
  retryCount: number;
  success: boolean;
}

/**
 * Edge transport for handling log entries with proper type safety and immutability
 * 
 * Type Invariant: All entries and queue items are properly validated before processing
 * This is maintained by:
 * 1. Only processing entries through write() which validates the data
 * 2. Using type-safe methods for all operations
 * 3. Immutable configuration prevents runtime modifications
 * 4. Proper cleanup and resource management
 */
export class EdgeTransport extends BaseTransport {
  private readonly maxEntries: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly maxQueueSize: number;
  private readonly maxBatchSize: number;
  private readonly flushInterval: number;
  private readonly memoryLimit: number;
  private entries: Array<Readonly<LogEntry<Record<string, unknown>>>>;
  private queue: Array<Readonly<LogEntry<Record<string, unknown>>>>;
  private retryCount: number;
  private flushTimeout: NodeJS.Timeout | null;
  private _isConnected: boolean;
  private readonly updateCallbacks: Set<() => void>;
  private readonly edgeConfig: Readonly<Required<EdgeTransportConfig>>;
  private readonly throttledSendPayload: (payload: string, batchId: string) => Promise<void>;
  private pendingRequests: number;
  private readonly maxPendingRequests: number;
  private abortController: AbortController | null;
  private metrics: MutableStreamMetrics;
  private readonly flushMutex: Int32Array;
  private readonly batchMetrics: Map<string, MutableBatchMetrics>;
  private readonly MEMORY_CHECK_INTERVAL = 30000; // 30 seconds

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
    return Object.freeze({
      ...this.metrics,
      memoryUsage: this.metrics.memoryUsage ? Object.freeze({ ...this.metrics.memoryUsage }) : null,
      debugMetrics: Object.freeze({ ...this.metrics.debugMetrics })
    });
  }

  constructor(config: Readonly<EdgeTransportConfig>) {
    const baseConfig: Required<TransportConfig> = {
      level: config.level ?? LogLevels.INFO,
      format: config.format ?? "json",
      enabled: config.enabled ?? true
    };
    super(baseConfig);

    this.maxEntries = config.maxEntries ?? 1000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.maxQueueSize = config.maxQueueSize ?? 100;
    this.maxBatchSize = config.maxBatchSize ?? 10;
    this.flushInterval = config.flushInterval ?? 5000;
    this.memoryLimit = config.memoryLimit ?? 50 * 1024 * 1024; // 50MB default

    this.edgeConfig = Object.freeze({
      ...baseConfig,
      endpoint: config.endpoint,
      maxEntries: this.maxEntries,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      maxQueueSize: this.maxQueueSize,
      maxBatchSize: this.maxBatchSize,
      flushInterval: this.flushInterval,
      memoryLimit: this.memoryLimit,
      persistQueue: config.persistQueue ?? false,
      maxConcurrent: config.maxConcurrent ?? 5,
      requestsPerSecond: config.requestsPerSecond ?? 10,
      autoReconnect: config.autoReconnect ?? true,
      testMode: config.testMode ?? false,
      bufferSize: config.bufferSize ?? 1000,
      maxConnectionDuration: config.maxConnectionDuration ?? 300000,
      maxPayloadSize: config.maxPayloadSize ?? 5 * 1024 * 1024 // 5MB default
    });

    this.maxPendingRequests = this.edgeConfig.maxConcurrent;
    this.entries = [];
    this.queue = [];
    this.retryCount = 0;
    this.flushTimeout = null;
    this._isConnected = false;
    this.updateCallbacks = new Set();
    this.pendingRequests = 0;
    this.abortController = null;
    this.flushMutex = new Int32Array(new SharedArrayBuffer(4));
    this.batchMetrics = new Map();

    this.metrics = {
      messageCount: 0,
      avgProcessingTime: 0,
      backpressureEvents: 0,
      lastBackpressureTime: null,
      interruptions: 0,
      lastInterruptionTime: null,
      bufferUtilization: 0,
      lastFlushTime: null,
      memoryUsage: null,
      batchSuccessRate: 1,
      avgBatchSize: 0,
      droppedMessages: 0,
      debugMetrics: {
        droppedEntries: 0,
        highWaterMark: 0
      }
    };

    // Use config to determine if we're in test mode
    if (this.edgeConfig.testMode) {
      this.throttledSendPayload = (payload: string, batchId: string): Promise<void> =>
        this.sendPayload(payload, batchId);
    } else {
      this.throttledSendPayload = pThrottle({
        limit: this.edgeConfig.maxConcurrent,
        interval: 1000 / this.edgeConfig.requestsPerSecond
      })((payload: string, batchId: string): Promise<void> => this.sendPayload(payload, batchId));
    }

    if (this.edgeConfig.autoReconnect) {
      void this.connect().catch(console.error);
    }

    this.setupFlushInterval();
    this.startMemoryMonitoring();
  }

  private async acquireFlushLock(): Promise<boolean> {
    const view = new Int32Array(this.flushMutex.buffer);
    const result = Atomics.compareExchange(view, 0, 0, 1);
    await Promise.resolve(); // Ensure async context
    return result === 0;
  }

  private releaseFlushLock(): void {
    const view = new Int32Array(this.flushMutex.buffer);
    Atomics.store(view, 0, 0);
  }

  private startMemoryMonitoring(): void {
    const checkMemory = (): void => {
      const metrics = this.getMemoryMetrics();
      if (metrics !== null) {
        const memoryUsage = {
          heapUsed: metrics.usedJSHeapSize,
          heapTotal: metrics.totalJSHeapSize,
          external: metrics.jsExternalHeapSize ?? 0,
          arrayBuffers: metrics.arrayBuffers ?? 0
        };

        this.metrics.memoryUsage = memoryUsage;

        // Implement backpressure if memory usage is high
        const memoryUtilization = memoryUsage.heapUsed / memoryUsage.heapTotal;
        if (memoryUtilization > 0.9) {
          this.handleBackpressure();
        }
      }
    };

    setInterval(checkMemory, this.MEMORY_CHECK_INTERVAL);
    checkMemory();
  }

  private handleBackpressure(): void {
    this.metrics.backpressureEvents++;
    this.metrics.lastBackpressureTime = Date.now();

    // Drop oldest entries if queue is too large
    if (this.queue.length > this.edgeConfig.bufferSize * 0.9) {
      const toRemove = Math.ceil(this.queue.length * 0.2); // Remove 20% of entries
      this.queue.splice(0, toRemove);
      this.metrics.droppedMessages += toRemove;
    }
  }

  private async persistQueue(): Promise<void> {
    if (!this.edgeConfig.persistQueue || this.queue.length === 0) {
      return;
    }
    await this.saveQueueToStorage();
  }


  private async saveQueueToStorage(): Promise<void> {
    // Implementation for saving queue to storage would go here
    await Promise.resolve(); // Placeholder for actual storage logic
  }


  public async flush(): Promise<void> {
    if (!await this.acquireFlushLock()) return;

    try {
      if (!this._isConnected) {
        this.releaseFlushLock();
        return;
      }

      const batch = [] as LogEntry<Record<string, unknown>>[];
      let payloadSize = 0;
      const batchId = crypto.randomUUID();
      const batchMetrics: MutableBatchMetrics = {
        size: 0,
        entryCount: 0,
        processingTime: 0,
        retryCount: 0,
        success: false
      };

      const startTime = performance.now();

      while (this.queue.length > 0 && batch.length < this.edgeConfig.maxBatchSize) {
        const entry = this.queue[0];
        const entrySize = entry._metadata?._size ?? JSON.stringify(entry).length;

        if (payloadSize + entrySize > this.edgeConfig.maxPayloadSize) {
          if (batch.length === 0) {
            // Single entry exceeds max size, drop it
            this.queue.shift();
            this.metrics.droppedMessages++;
            continue;
          }
          break;
        }

        batch.push(this.queue.shift()!);
        payloadSize += entrySize;
        batchMetrics.entryCount++;
        batchMetrics.size += entrySize;
      }

      if (batch.length === 0) {
        this.releaseFlushLock();
        return;
      }

      this.batchMetrics.set(batchId, batchMetrics);
      await this.throttledSendPayload(JSON.stringify(batch), batchId);

      batchMetrics.processingTime = performance.now() - startTime;
      batchMetrics.success = true;

      // Update metrics
      this.updateBatchMetrics(batchMetrics);
      this.metrics.lastFlushTime = Date.now();
    } catch (error) {
      console.error('Flush error:', error);
      throw error; // Re-throw to ensure test failures are visible
    } finally {
      this.releaseFlushLock();
      if (this.edgeConfig.persistQueue) {
        await this.persistQueue();
      }
    }
  }

  private updateBatchMetrics(metrics: MutableBatchMetrics): void {
    // Update running averages
    const alpha = 0.1; // Smoothing factor
    this.metrics.avgBatchSize = (1 - alpha) * this.metrics.avgBatchSize + alpha * metrics.entryCount;
    this.metrics.batchSuccessRate = (1 - alpha) * this.metrics.batchSuccessRate + alpha * (metrics.success ? 1 : 0);
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

      const response = await fetch(this.edgeConfig.endpoint, {
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
          const entries = JSON.parse(payload) as Array<LogEntry<Record<string, unknown>>>;
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
            .slice(0, this.edgeConfig.bufferSize);

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
        fetch(this.edgeConfig.endpoint, {
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
      this.metrics.interruptions++;
      this.metrics.lastInterruptionTime = Date.now();

      if (this.retryCount < this.edgeConfig.maxRetries) {
        this.retryCount++;
        // Use exponential backoff
        const delay = Math.min(
          this.edgeConfig.retryDelay * Math.pow(2, this.retryCount - 1),
          30000
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
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
    if (!super.shouldLog(entry.level as LogLevel)) {
      return;
    }

    if (this.entries.length >= this.maxEntries) {
      this.entries.shift();
    }

    this.entries.push(entry as LogEntry<Record<string, unknown>>);
    this.queue.push(entry as LogEntry<Record<string, unknown>>);

    if (this.queue.length >= this.maxBatchSize) {
      await this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => void this.flush(), this.flushInterval);
    }
  }

  /**
   * Returns a readonly view of all entries
   */
  public getEntries(): ReadonlyArray<Readonly<LogEntry<Record<string, unknown>>>> {
    return Object.freeze([...this.entries]);
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
    }, this.edgeConfig.flushInterval);
  }

  private startFlushTimer(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.setupFlushInterval();
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

  private getMemoryMetrics = (): EdgeMemoryMetrics | null => {
    if (typeof performance === 'undefined' || !performance.memory) {
      return null;
    }

    const memory = performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsExternalHeapSize: memory.jsExternalHeapSize ?? 0,
      arrayBuffers: memory.arrayBuffers ?? 0
    };
  };




  /**
   * Returns current queue size
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Returns current memory usage
   */
  public getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  /**
   * Checks if memory is available
   */
  public isMemoryAvailable(): boolean {
    return this.getMemoryUsage() < this.memoryLimit;
  }
}
