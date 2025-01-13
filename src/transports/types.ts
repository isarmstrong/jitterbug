import {
  type LogEntry,
  type LogTransport,
  type LogLevel,
} from "../types/types";
import { LogLevels } from "../types/enums";

/**
 * Transport configuration interface
 */
export interface TransportConfig {
  enabled?: boolean;
  level?: LogLevel;
  format?: "pretty" | "json";
}

/**
 * Transport base class
 */
export abstract class BaseTransport implements LogTransport {
  protected config: Required<TransportConfig>;

  constructor(config?: TransportConfig) {
    this.config = {
      enabled: config?.enabled ?? true,
      level: config?.level ?? LogLevels.DEBUG,
      format: config?.format ?? "pretty",
    };
  }

  abstract write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void>;

  protected shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevels.DEBUG,
      LogLevels.INFO,
      LogLevels.WARN,
      LogLevels.ERROR,
      LogLevels.FATAL,
    ];
    const configIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= configIndex;
  }

  protected formatEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): string {
    if (this.config.format === "json") {
      return JSON.stringify(entry);
    }

    const timestamp = new Date(entry.context.timestamp).toISOString();
    const level = entry.level.padEnd(5);
    const namespace = entry.context.namespace;
    const message = entry.message;
    const data = entry.data ? JSON.stringify(entry.data) : "";
    const error = entry.error ? `\n${entry.error.stack}` : "";

    return `[${timestamp}] ${level} ${namespace}: ${message}${data}${error}`;
  }
}
