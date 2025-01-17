/// <reference lib="dom" />
/// <reference types="node" />

import { type LogEntry, type LogTransport } from "../types/types.js";

export interface EdgeTransportConfig {
  endpoint: string;
  batchSize?: number;
  flushInterval?: number;
  maxRetries?: number;
  maxConnectionDuration?: number;
  maxEntries?: number;
  maxPayloadSize?: number;
}

export interface EdgeTransportEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onFlush?: () => void;
}

export class EdgeTransport implements LogTransport {
  private queue: Array<LogEntry<Record<string, unknown>>> = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private retryCount = 0;
  private updateCallbacks: Set<() => void> = new Set();
  private readonly config: Required<EdgeTransportConfig>;

  constructor(config: EdgeTransportConfig) {
    this.config = {
      endpoint: config.endpoint,
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      maxConnectionDuration: config.maxConnectionDuration ?? 60000,
      maxEntries: config.maxEntries ?? 1000,
      maxPayloadSize: config.maxPayloadSize ?? 1024,
    };
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Validate endpoint
      const response = await fetch(this.config.endpoint, {
        method: "HEAD",
        headers: {
          "X-Runtime": "edge",
          "X-Environment": "production",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`);
      }

      this.isConnected = true;
      this.retryCount = 0;
      this.startFlushTimer();
    } catch (error) {
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.connect();
      }
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Flush any remaining entries
    if (this.queue.length > 0) {
      await this.flush();
    }
  }

  public async write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    this.queue.push(entry as LogEntry<Record<string, unknown>>);

    // Enforce max entries limit
    if (this.queue.length > this.config.maxEntries) {
      this.queue = this.queue.slice(-this.config.maxEntries);
    }

    // Flush if batch size is reached
    if (this.queue.length >= this.config.batchSize) {
      await this.flush();
    }

    this.notifyUpdate();
  }

  public onUpdate(callback: () => void): void {
    this.updateCallbacks.add(callback);
  }

  public getEntries(): Array<LogEntry<Record<string, unknown>>> {
    return this.queue;
  }

  private startFlushTimer(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(async () => {
      await this.flush();
      this.startFlushTimer();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (!this.isConnected || this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.batchSize);
    const payload = JSON.stringify(batch);

    // Check payload size
    if (payload.length > this.config.maxPayloadSize) {
      // If payload is too large, try sending entries individually
      for (const entry of batch) {
        const singlePayload = JSON.stringify([entry]);
        if (singlePayload.length <= this.config.maxPayloadSize) {
          await this.sendPayload(singlePayload);
        }
      }
      return;
    }

    await this.sendPayload(payload);
  }

  private async sendPayload(payload: string): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Runtime": "edge",
          "X-Environment": "production",
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Failed to send payload: ${response.status}`);
      }
    } catch (error) {
      // Put failed entries back in queue
      const entries = JSON.parse(payload);
      this.queue.unshift(...entries);

      // Enforce max entries limit
      if (this.queue.length > this.config.maxEntries) {
        this.queue = this.queue.slice(-this.config.maxEntries);
      }

      throw error;
    }
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => callback());
  }

  public async destroy(): Promise<void> {
    await this.disconnect();
    this.updateCallbacks.clear();
  }
}
