/// <reference lib="dom" />

import { LogTransport, LogEntry } from "../types";

export interface EdgeTransportConfig {
  endpoint: string;
  maxRetries?: number;
  retryInterval?: number;
  maxConnectionDuration?: number;
}

export interface EdgeTransportEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnecting?: () => void;
  onMaxRetriesExceeded?: () => void;
}

export class EdgeTransport implements LogTransport {
  private eventSource: EventSource | null = null;
  private queue: Array<LogEntry<Record<string, unknown>>> = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private retryInterval: number;
  private maxConnectionDuration: number;
  private updateCallbacks: Set<() => void> = new Set();
  private events: EdgeTransportEvents;

  constructor(
    private config: EdgeTransportConfig,
    events?: EdgeTransportEvents,
  ) {
    this.maxReconnectAttempts = config.maxRetries ?? 3;
    this.retryInterval = config.retryInterval ?? 1000;
    this.maxConnectionDuration = config.maxConnectionDuration ?? 270000; // 4.5 minutes
    this.events = events ?? {};
    void this.connect();
  }

  public connect(): Promise<void> {
    if (typeof EventSource === "undefined") {
      console.warn("EventSource is not supported in this environment");
      return Promise.resolve();
    }

    this.eventSource = new EventSource(this.config.endpoint);
    this.setupEventHandlers();
    return Promise.resolve();
  }

  public disconnect(): void {
    this.cleanup();
    this.events.onDisconnect?.();
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      void this.flushQueue();
      this.events.onConnect?.();
      this.notifyUpdate();
    };

    this.eventSource.onerror = () => {
      this.isConnected = false;
      this.handleReconnect();
    };
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.events.onMaxRetriesExceeded?.();
      this.cleanup();
      return;
    }

    this.reconnectAttempts++;
    this.events.onReconnecting?.();

    setTimeout(
      () => {
        void this.connect();
      },
      Math.pow(2, this.reconnectAttempts) * this.retryInterval,
    );
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  private handleMessage(event: MessageEvent<string>): void {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      console.log("Received:", data);
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  }

  private handleError(event: Event): void {
    console.error("SSE Error:", event);
    this.isConnected = false;
    this.handleReconnect();
  }

  private async flushQueue(): Promise<void> {
    while (this.isConnected && this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry) {
        await this.sendEntry(entry);
      }
    }
  }

  private async sendEntry(
    entry: LogEntry<Record<string, unknown>>,
  ): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.events.onError?.(error);
      }
      console.error("Failed to send log entry:", error);
      this.queue.push(entry);
    }
  }

  public async write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (this.isConnected) {
      await this.sendEntry(entry as LogEntry<Record<string, unknown>>);
    } else {
      this.queue.push(entry as LogEntry<Record<string, unknown>>);
    }
  }

  public onUpdate(callback: () => void): void {
    this.updateCallbacks.add(callback);
  }

  public getEntries(): Array<LogEntry<Record<string, unknown>>> {
    return this.queue;
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach((callback) => callback());
  }
}
