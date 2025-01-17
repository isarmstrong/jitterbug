import { type LogEntry, type LogTransport } from "../types/types.js";
import { EdgeTransport } from "./edge.js";

export interface GUITransportConfig {
  maxEntries?: number;
  bufferSize?: number;
  edge: {
    endpoint: string;
    batchSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    maxConnectionDuration?: number;
    maxEntries?: number;
    maxPayloadSize?: number;
  };
  autoReconnect?: boolean;
}

export interface GUITransportState {
  isConnected: boolean;
  isReconnecting: boolean;
  hasReachedMaxRetries: boolean;
  lastError: Error | null;
  bufferedEntries: number;
}

export class GUITransport implements LogTransport {
  private transport: EdgeTransport;
  private entries: Array<LogEntry<Record<string, unknown>>> = [];
  private buffer: Array<LogEntry<Record<string, unknown>>> = [];
  private filters: Record<string, boolean> = {};
  private updateCallbacks: Set<() => void> = new Set();
  private stateUpdateCallbacks: Set<(state: GUITransportState) => void> =
    new Set();
  private isConnected = false;
  private isReconnecting = false;
  private hasReachedMaxRetries = false;
  private lastError: Error | null = null;

  constructor(private config: GUITransportConfig) {
    this.config.maxEntries = config.maxEntries ?? 1000;
    this.config.bufferSize = config.bufferSize ?? 100;
    this.config.autoReconnect = config.autoReconnect ?? true;

    this.transport = new EdgeTransport(config.edge);
    this.transport.onUpdate(() => {
      // Sync entries from edge transport
      const edgeEntries = this.transport.getEntries();
      this.entries = edgeEntries.filter(
        (entry: LogEntry<Record<string, unknown>>) =>
          this.filters[entry.context.namespace] !== false,
      );
      this.notifyUpdate();
    });

    // Connect immediately if autoReconnect is enabled
    if (this.config.autoReconnect) {
      void this.connect().catch((error: Error) => {
        console.error('Failed to auto-connect:', error);
        this.lastError = error;
        this.notifyStateUpdate();
      });
    }
  }

  public async connect(): Promise<void> {
    this.hasReachedMaxRetries = false; // Reset max retries flag on manual connect
    await this.transport.connect();
  }

  public disconnect(): void {
    void this.transport.disconnect().catch((error) => {
      console.error('Failed to disconnect:', error);
      this.lastError = error;
      this.notifyStateUpdate();
    });
  }

  public async write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (!this.isConnected) {
      this.buffer.push(entry as LogEntry<Record<string, unknown>>);
      if (this.buffer.length > this.config.bufferSize!) {
        this.buffer.shift(); // Remove oldest entry when buffer is full
      }
      this.notifyStateUpdate();
      return;
    }

    await this.transport.write(entry as LogEntry<Record<string, unknown>>);
    this.addEntry(entry as LogEntry<Record<string, unknown>>);
  }

  public getEntries(): Array<LogEntry<Record<string, unknown>>> {
    return this.entries.filter(
      (entry: LogEntry<Record<string, unknown>>) =>
        this.filters[entry.context.namespace] !== false,
    );
  }

  public setFilter(namespace: string, enabled: boolean): void {
    this.filters[namespace] = enabled;
    // Re-filter entries when filter changes
    this.entries = this.transport
      .getEntries()
      .filter(
        (entry: LogEntry<Record<string, unknown>>) =>
          this.filters[entry.context.namespace] !== false,
      );
    this.notifyUpdate();
  }

  public onUpdate(callback: () => void): void {
    this.updateCallbacks.add(callback);
  }

  public onStateUpdate(callback: (state: GUITransportState) => void): void {
    this.stateUpdateCallbacks.add(callback);
    // Immediately notify of current state
    callback(this.getState());
  }

  public getState(): GUITransportState {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      hasReachedMaxRetries: this.hasReachedMaxRetries,
      lastError: this.lastError,
      bufferedEntries: this.buffer.length,
    };
  }

  private addEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): void {
    if (this.filters[entry.context.namespace] !== false) {
      this.entries.push(entry as LogEntry<Record<string, unknown>>);
      if (this.entries.length > this.config.maxEntries!) {
        this.entries.shift();
      }
      this.notifyUpdate();
    }
  }

  private async processBuffer(): Promise<void> {
    const promises: Array<Promise<void>> = [];
    const entries = this.buffer.slice(); // Create a copy of the buffer
    this.buffer = []; // Clear the buffer before processing

    for (const entry of entries) {
      promises.push(this.transport.write(entry));
      this.addEntry(entry);
    }

    await Promise.all(promises).catch((error) => {
      console.error("Failed to process buffer:", error);
      // Put failed entries back in buffer
      this.buffer.push(...entries);
      this.notifyStateUpdate();
    });
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach((callback) => callback());
  }

  private notifyStateUpdate(): void {
    const state = this.getState();
    this.stateUpdateCallbacks.forEach((callback) => callback(state));
  }
}
