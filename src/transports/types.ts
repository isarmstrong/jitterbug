import type {
  LogEntry,
  LogTransport,
  LogLevel,
} from "../types/core";
import { LogLevels } from "../types/enums";

/**
 * Transport configuration interface
 */
export interface TransportConfig {
  enabled?: boolean;
  level?: LogLevel;
  format?: "pretty" | "json";
}

export interface GuiConfig {
  maxEntries: number;
  autoScroll: boolean;
}

export interface EdgeTransportConfig extends TransportConfig {
  endpoint: string;
  maxEntries?: number;
  maxRetries?: number;
  retryDelay?: number;
  maxQueueSize?: number;
  maxBatchSize?: number;
  flushInterval?: number;
  memoryLimit?: number;
  persistQueue?: boolean;
  maxConcurrent?: number;
  requestsPerSecond?: number;
  autoReconnect?: boolean;
  testMode?: boolean;
  bufferSize?: number;
  maxConnectionDuration?: number;
  maxPayloadSize?: number;
}

/**
 * Base transport interface extending LogTransport with config
 */
export interface BaseTransportType extends LogTransport {
  config: Required<TransportConfig>;
  write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;
  shouldLog(level: LogLevel): boolean;
  formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string;
  close?(): void;
}

/**
 * Transport base class implementing BaseTransportType
 */
export class BaseTransport implements BaseTransportType {
  public readonly config: Required<TransportConfig>;

  constructor(config: TransportConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      level: config.level ?? LogLevels.INFO,
      format: config.format ?? "pretty"
    };
  }

  public async write<T extends Record<string, unknown>>(_entry: LogEntry<T>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels = Object.values(LogLevels);
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  public formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    if (this.config.format === "json") {
      return JSON.stringify(entry);
    }

    const timestamp = entry.context?.timestamp
      ? new Date(entry.context.timestamp as number).toISOString()
      : new Date().toISOString();
    const level = entry.level.padEnd(5);
    const namespace = entry.context?.namespace ?? "unknown";
    const message = entry.message;
    const data = entry.data ? JSON.stringify(entry.data) : "";
    const error = entry.error ? `\n${entry.error.stack}` : "";

    return `[${timestamp}] ${level} ${namespace}: ${message}${data}${error}`;
  }

  public close?(): void {
    // Implementation needed
  }
}
