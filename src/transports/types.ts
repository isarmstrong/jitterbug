import type {
  LogEntry,
  LogTransport,
  LogLevel,
  BaseLogContext
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

  /**
   * Base write implementation that throws by default.
   * This method maintains an async signature for consistency across transports.
   * 
   * Design Pattern: "Async Contract Preservation"
   * - Maintains interface consistency
   * - Enables transport composition
   * - Ensures proper error handling
   */
  public async write<T extends Record<string, unknown>>(_entry: LogEntry<T>): Promise<void> {
    // Ensure consistent async context even for errors
    await Promise.resolve();
    throw new Error("Method not implemented.");
  }

  public shouldLog(level: LogLevel): boolean {
    if (this.config.enabled !== true) return false;

    const levels = Object.values(LogLevels);
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private formatTimestamp(timestamp: string | undefined): string {
    if (timestamp === undefined || timestamp === null || timestamp.length === 0) {
      return new Date().toISOString();
    }
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private formatContext<T extends Record<string, unknown>>(context: T | undefined): { timestamp: string; namespace: string } {
    // Handle the case where context might be a BaseLogContext
    if (context !== undefined && context !== null &&
      typeof context === 'object' &&
      'timestamp' in context &&
      'namespace' in context) {
      const logContext = context as unknown as BaseLogContext;
      return {
        timestamp: this.formatTimestamp(logContext.timestamp),
        namespace: typeof logContext.namespace === 'string' && logContext.namespace.length > 0
          ? logContext.namespace
          : "unknown"
      };
    }

    return {
      timestamp: new Date().toISOString(),
      namespace: "unknown"
    };
  }

  private formatError(error: unknown): string {
    if (error === undefined || error === null) return "";
    return error instanceof Error ? `\n${error.stack ?? error.message}` : "";
  }

  private formatData<T extends Record<string, unknown>>(data: T | undefined): string {
    if (data === undefined || data === null) return "";
    try {
      return ` ${JSON.stringify(data)}`;
    } catch {
      return " [Unserializable Data]";
    }
  }

  public formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    if (this.config.format === "json") {
      return JSON.stringify(entry);
    }

    const { timestamp, namespace } = this.formatContext(entry.context);
    const level = entry.level.padEnd(5);
    const message = entry.message;
    const data = entry.data !== undefined && entry.data !== null && typeof entry.data === 'object'
      ? this.formatData(entry.data as Record<string, unknown>)
      : "";
    const error = this.formatError(entry.error);

    return `[${timestamp}] ${level} ${namespace}: ${message}${data}${error}`;
  }

  public close?(): void {
    // Implementation needed
  }
}
