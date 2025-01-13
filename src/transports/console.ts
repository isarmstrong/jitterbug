import { LogLevels } from "../types/enums";
import type { LogEntry } from "../types/types";
import { BaseTransport, TransportConfig } from "./types";

/**
 * Console transport configuration
 */
export interface ConsoleConfig extends TransportConfig {
  colors?: boolean;
}

/**
 * Console transport implementation
 */
export class ConsoleTransport extends BaseTransport {
  private readonly colors = {
    [LogLevels.DEBUG]: "\x1b[90m", // Gray
    [LogLevels.INFO]: "\x1b[32m", // Green
    [LogLevels.WARN]: "\x1b[33m", // Yellow
    [LogLevels.ERROR]: "\x1b[31m", // Red
    [LogLevels.FATAL]: "\x1b[35m", // Magenta
  } as const;
  private readonly reset = "\x1b[0m";
  private readonly methods = {
    [LogLevels.DEBUG]: "debug",
    [LogLevels.INFO]: "info",
    [LogLevels.WARN]: "warn",
    [LogLevels.ERROR]: "error",
    [LogLevels.FATAL]: "error",
  } as const;

  constructor(config?: ConsoleConfig) {
    super(config);
  }

  public write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (!this.shouldLog(entry.level)) return Promise.resolve();

    const method = this.methods[entry.level];
    const message = this.formatEntry(entry);

    if (entry.error) {
      console[method](message, entry.error);
    } else if (entry.data) {
      console[method](message, entry.data);
    } else {
      console[method](message);
    }

    return Promise.resolve();
  }

  protected formatEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): string {
    const timestamp = new Date(entry.context.timestamp).toISOString();
    const level = entry.level.padEnd(5);
    const namespace = entry.context.namespace;
    const message = entry.message;

    if ((this.config as ConsoleConfig).colors) {
      const color = this.colors[entry.level];
      return `${color}[${timestamp}] ${level} ${namespace}:${this.reset} ${message}`;
    }

    return `[${timestamp}] ${level} ${namespace}: ${message}`;
  }
}
