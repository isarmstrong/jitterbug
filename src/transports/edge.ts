/// <reference lib="dom" />
/// <reference types="node" />

import { LogEntry, LogTransport } from '../types/types.js';

export interface EdgeTransportConfig {
  endpoint: string;
  bufferSize?: number;
  retryInterval?: number;
  maxRetries?: number;
  maxConnectionDuration?: number;
  maxEntries?: number;
  maxPayloadSize?: number;
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
      bufferSize: config.bufferSize ?? 100,
      retryInterval: config.retryInterval ?? 5000,
      maxRetries: config.maxRetries ?? 5,
      maxConnectionDuration: config.maxConnectionDuration ?? 4.5 * 60 * 1000,
      maxEntries: config.maxEntries ?? 1000,
      maxPayloadSize: config.maxPayloadSize ?? 128 * 1024,
    };
    void this.connect();
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
        await new Promise(resolve => setTimeout(resolve, this.config.retryInterval));
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

  public async write(entry: LogEntry<Record<string, unknown>>): Promise<void> {
    this.queue.push(entry);

    // Enforce max entries limit
    if (this.queue.length > this.config.maxEntries) {
      this.queue = this.queue.slice(-this.config.maxEntries);
    }

    // Flush if buffer size is reached
    if (this.queue.length >= this.config.bufferSize) {
      await this.flush();
    }

    this.notifyUpdate();
  }

  public getEntries(): Array<LogEntry<Record<string, unknown>>> {
    return this.queue;
  }

  public onUpdate(callback: () => void): void {
    this.updateCallbacks.add(callback);
  }

  private startFlushTimer(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      void this.flush().then(() => {
        this.startFlushTimer();
      });
    }, this.config.retryInterval);
  }

  private async flush(): Promise<void> {
    if (!this.isConnected || this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.bufferSize);
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
      const entries = JSON.parse(payload) as Array<LogEntry<Record<string, unknown>>>;
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
