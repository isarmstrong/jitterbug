import {
  type LogEntry,
  type LogLevel,
  LogLevels,
  type LogTransport,
} from "../types";

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

  constructor(config: TransportConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      level: config.level ?? LogLevels.INFO,
      format: config?.format ?? "pretty",
    };
  }

  abstract write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void>;

  protected shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels = Object.values(LogLevels);
    const configLevel = this.config.level.toUpperCase() as keyof typeof LogLevels;
    const entryLevel = level.toUpperCase() as keyof typeof LogLevels;

    const configIndex = levels.indexOf(configLevel);
    const messageIndex = levels.indexOf(entryLevel);
    return messageIndex >= configIndex;
  }

  protected formatEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): string {
    if (this.config.format === "json") {
      return JSON.stringify(entry);
    }

    const timestamp = new Date(Number(entry.context?.timestamp ?? 0)).toISOString();
    const level = entry.level.padEnd(5);
    const namespace = String(entry.context?.namespace ?? "");
    const message = entry.message;
    const data = (entry as any).data ? JSON.stringify((entry as any).data) : "";
    const error = (entry as any).error ? `\n${(entry as any).error.stack}` : "";

    return `[${timestamp}] ${level} ${namespace}: ${message}${data}${error}`;
  }
}
