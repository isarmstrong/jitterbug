/// <reference lib="dom" />

import pThrottle from "p-throttle";
import { LogEntry, LogTransport } from "../types";
import { EDGE_DEFAULTS } from '../config/defaults';

export interface EdgeTransportConfig {
  endpoint: string;
  maxEntries?: number;
  bufferSize?: number;
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
}

interface StreamMetrics {
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

interface BatchMetrics {
  size: number;
  entryCount: number;
  processingTime: number;
  retryCount: number;
  success: boolean;
}

export class EdgeTransport implements LogTransport {
  private queue: LogEntry[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private retryCount = 0;
  private updateCallbacks: Set<() => void> = new Set();
  private readonly config: Required<EdgeTransportConfig>;
  private throttledSendPayload: (payload: string, batchId: string) => Promise<void>;
  private pendingRequests = 0;
  private readonly maxPendingRequests: number;
  private abortController: AbortController | null = null;
  private metrics: StreamMetrics = {
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
  private processingTimes: number[] = [];
  private isFlushing = false;
  private flushMutex = new Int32Array(new SharedArrayBuffer(4));
  private batchMetrics: Map<string, BatchMetrics> = new Map();
  private lastMemoryCheck = 0;
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
    return Object.freeze({ ...this.metrics });
  }

  constructor(config: EdgeTransportConfig) {
    const defaultConfig: Required<EdgeTransportConfig> = {
      ...EDGE_DEFAULTS,
      endpoint: '',
      persistQueue: true
    };

    this.config = {
      ...defaultConfig,
      ...config
    };

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

  private async acquireFlushLock(): Promise<boolean> {
    const view = new Int32Array(this.flushMutex.buffer);
    return Atomics.compareExchange(view, 0, 0, 1) === 0;
  }

  private releaseFlushLock(): void {
    const view = new Int32Array(this.flushMutex.buffer);
    Atomics.store(view, 0, 0);
  }

  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = {
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
          external: memory.jsExternalHeapSize || 0,
          arrayBuffers: memory.arrayBuffers || 0
        };

        // Implement backpressure if memory usage is high
        if (this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal > 0.9) {
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
    if (this.queue.length > this.config.bufferSize * 0.9) {
      const toRemove = Math.ceil(this.queue.length * 0.2); // Remove 20% of entries
      this.queue.splice(0, toRemove);
      this.metrics.droppedMessages += toRemove;
    }
  }

  private async persistQueue(): Promise<void> {
    if (!this.config.persistQueue) return;
    // Edge-specific persistence logic can be added later
  }

  private async restoreQueue(): Promise<void> {
    if (!this.config.persistQueue) return;
    // Edge-specific restoration logic can be added later
  }

  public async flush(): Promise<void> {
    if (!await this.acquireFlushLock()) return;

    try {
      if (!this._isConnected) {
        this.releaseFlushLock();
        return;
      }

      let batch = [];
      let payloadSize = 0;
      const batchId = crypto.randomUUID();
      const batchMetrics: BatchMetrics = {
        size: 0,
        entryCount: 0,
        processingTime: 0,
        retryCount: 0,
        success: false
      };

      const startTime = performance.now();

      while (this.queue.length > 0 && batch.length < this.config.batchSize) {
        const entry = this.queue[0];
        const entrySize = entry._metadata?._size ?? JSON.stringify(entry).length;

        if (payloadSize + entrySize > this.config.maxPayloadSize) {
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
      if (this.config.persistQueue) {
        await this.persistQueue();
      }
    }
  }

  private updateBatchMetrics(metrics: BatchMetrics): void {
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
      this.metrics.interruptions++;
      this.metrics.lastInterruptionTime = Date.now();

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

  public async write(entry: LogEntry<Record<string, unknown>>): Promise<void> {
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
    this.metrics.bufferUtilization = this.queue.length / this.config.bufferSize;

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
}
