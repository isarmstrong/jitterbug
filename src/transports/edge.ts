/// <reference lib="dom" />

import pThrottle from "p-throttle";
import { EDGE_DEFAULTS } from '../config/defaults';
import { LogEntry, LogLevels, LogTransport } from "../types/core";
import { MemoryMetrics, MemoryUnit } from '../types/ebl/memory';
import {
  BaseTransport,
  BatchMetrics,
  EdgeEvent,
  EdgeTransportConfig,
  RetryStrategy,
  EdgeMetrics as StreamMetrics,
  TransportErrorCode
} from '../types/transports';
import { Storage } from '../utils/storage';

export type { EdgeTransportConfig };

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
    const defaultRetryStrategy: RetryStrategy = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2
    };

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
      errorHandler: config.errorHandler ?? ((error): void => console.error('Transport Error:', error)),
      retryStrategy: config.retryStrategy ?? defaultRetryStrategy
    } as Required<EdgeTransportConfig>;

    this._memoryThreshold = this.config.memoryThreshold;
    this.storage = new Storage();
    this.maxPendingRequests = this.config.maxConcurrent;

    // Use config to determine if we're in test mode
    if (this.config.testMode) {
      this.throttledSendPayload = (payload: string, batchId: string): Promise<void> => this.sendPayload(payload, batchId);
    } else {
      this.throttledSendPayload = pThrottle({
        limit: this.config.maxConcurrent,
        interval: 1000 / this.config.requestsPerSecond
      })((payload: string, batchId: string): Promise<void> => this.sendPayload(payload, batchId));
    }

    if (this.config.autoReconnect) {
      void this.connect().catch(error => this.handleError(error, TransportErrorCode.CONNECTION_FAILED));
    }

    this.setupFlushInterval();
    this.startMemoryMonitoring();
  }

  private createFlushCallback(): () => Promise<void> {
    return async (): Promise<void> => {
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

  private async validateAndQueue(entry: LogEntry): Promise<void> {
    if (this.queue.length >= this.config.bufferSize) {
      this.queue.shift(); // Remove oldest entry if buffer is full
    }
    this.queue.push(entry);
    await this.persistQueue();
  }

  private async processBatch(batch: LogEntry[]): Promise<void> {
    await Promise.all(batch.map(entry => this.processEntry(entry)));
  }

  private async processEntry(entry: LogEntry): Promise<void> {
    await this.validateAndQueue(entry);
  }

  private async sendPayload(payload: string, batchId: string): Promise<void> {
    if (!this._isConnected || this.pendingRequests >= this.maxPendingRequests) {
      throw new Error('Transport not connected or too many pending requests');
    }

    this.pendingRequests++;
    const batchMetrics = this.batchMetrics.get(batchId);

    try {
      await this.withRetry(async (): Promise<void> => {
        const controller = new AbortController();
        const timeoutId = setTimeout((): void => { controller.abort(); }, 30000);

        try {
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
        } finally {
          clearTimeout(timeoutId);
        }
      }, TransportErrorCode.CONNECTION_FAILED);
    } catch (error) {
      if (batchMetrics) {
        batchMetrics.success = false;
        batchMetrics.retryCount++;
      }
      throw error;
    } finally {
      this.pendingRequests--;
    }
  }

  // Add the function at class root level
  private connectionTimeoutExecutor(_resolve: (value: never) => void, reject: (reason?: unknown) => void): void {
    void setTimeout((): void => { reject(new Error("Connection timeout")); }, 10000);
  }

  public async connect(): Promise<void> {
    if (this._isConnected) return;

    // Cancel any existing connection attempt
    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const response = await Promise.race([
        fetch(this.config.endpoint, {
          method: "HEAD",
          headers: {
            "X-Runtime": "edge",
            "X-Environment": "production",
          },
          signal: this.abortController.signal
        }),
        new Promise<never>((resolve: (value: never) => void, reject: (reason?: unknown) => void): void => {
          this.connectionTimeoutExecutor(resolve, reject);
        })
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
        await new Promise<void>((resolve: () => void): void => {
          void setTimeout((): void => { resolve(); }, backoff);
        });
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

    try {
      if (!this._isConnected && this.config.autoReconnect) {
        await this.withRetry(((): Promise<void> => this.connect()),
          TransportErrorCode.CONNECTION_FAILED
        );
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
        this.notifyEvent({
          type: 'backpressure',
          timestamp: Date.now(),
          data: {
            queueSize: this.queue.length,
            bufferSize: this.config.bufferSize
          }
        });
      }

      // Immediate flush if batch size reached
      if (this.queue.length >= this.config.batchSize) {
        await this.withRetry(((): Promise<void> => this.flush()),
          TransportErrorCode.SERIALIZATION_FAILED
        );
      }

      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) this.processingTimes.shift();
      this.metrics.avgProcessingTime =
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;

    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        TransportErrorCode.SERIALIZATION_FAILED
      );
      throw error;
    }
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

    this.flushTimeout = setTimeout((): void => {
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

  private startMemoryMonitoring(): void {
    setInterval((): void => {
      const now = Date.now();
      if (now - this.lastMemoryCheck >= this.MEMORY_CHECK_INTERVAL) {
        this.updateMetrics();
        this.lastMemoryCheck = now;
      }
    }, this.MEMORY_CHECK_INTERVAL);
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
    this.notifyEvent({
      type: 'error',
      timestamp: Date.now(),
      data: {
        type: TransportErrorCode.MEMORY_PRESSURE,
        heapUsed: this.metrics.memoryUsage.heapUsed,
        threshold: this._memoryThreshold
      }
    });
    this.flush().catch(error => {
      this.handleError(error, TransportErrorCode.MEMORY_PRESSURE);
    });
    this.clearBuffer();
  }

  private clearBuffer(): void {
    this.queue = [];
    this.metrics.bufferUsage = 0;
  }

  private notifyEvent(_event: EdgeEvent): void {
    // Notify subscribers about transport events
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          TransportErrorCode.INVALID_STATE
        );
      }
    });
  }

  protected onError(_event: Event): void {
    // Handle error events
    if (_event instanceof ErrorEvent) {
      this.metrics.errorCount++;
      this.metrics.lastErrorTime = Date.now();
    }
  }

  protected async withRetry<T>(operation: () => Promise<T>, _errorCode: TransportErrorCode): Promise<T> {
    let attempt = 0;
    const { maxRetries, baseDelay, maxDelay, backoffFactor } = this.config.retryStrategy;

    while (attempt < maxRetries) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        attempt++;
        if (attempt === maxRetries) {
          throw error;
        }
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        await new Promise<void>((resolve: () => void): void => {
          void setTimeout((): void => { resolve(); }, delay);
        });
      }
    }
    throw new Error('Unreachable code in withRetry');
  }

  protected handleError(error: Error, code: TransportErrorCode): void {
    this.config.errorHandler({
      code,
      message: error.message,
      name: error.name
    });
  }
}
