import { LogLevels } from "../types/enums.js";
import type { LogEntry, LogLevel } from "../types/types.js";
import { BaseTransport, type TransportConfig } from "./types.js";

/**
 * Console transport configuration
 */
export interface ConsoleConfig extends TransportConfig {
  colors?: boolean;
}

type ConsoleMethod = "debug" | "info" | "warn" | "error";

/**
 * Console transport implementation
 */
export class ConsoleTransport extends BaseTransport {
  declare protected config: Required<ConsoleConfig>;
  private readonly colors: Record<LogLevel, string> = {
    [LogLevels.DEBUG]: "\x1b[90m", // Gray
    [LogLevels.INFO]: "\x1b[32m", // Green
    [LogLevels.WARN]: "\x1b[33m", // Yellow
    [LogLevels.ERROR]: "\x1b[31m", // Red
    [LogLevels.FATAL]: "\x1b[35m", // Magenta
  };
  private readonly reset = "\x1b[0m";
  private readonly methods: Record<LogLevel, ConsoleMethod> = {
    [LogLevels.DEBUG]: "debug",
    [LogLevels.INFO]: "info",
    [LogLevels.WARN]: "warn",
    [LogLevels.ERROR]: "error",
    [LogLevels.FATAL]: "error",
  };

  constructor(config?: ConsoleConfig) {
    super(config);
    this.config = {
      ...this.config,
      colors: config?.colors ?? true,
    };
  }

  public override write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (!this.shouldLog(entry.level)) return Promise.resolve();

    const method = this.methods[entry.level];
    const message = this.formatEntry(entry);

    if (entry.error) {
      (console[method] as (...args: unknown[]) => void)(message, entry.error);
    } else if (entry.data) {
      (console[method] as (...args: unknown[]) => void)(message, entry.data);
    } else {
      (console[method] as (...args: unknown[]) => void)(message);
    }

    return Promise.resolve();
  }

  protected override formatEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): string {
    const timestamp = new Date(entry.context.timestamp).toISOString();
    const level = String(entry.level).padEnd(5);
    const namespace = entry.context.namespace;
    const message = entry.message;

    if (this.config.colors) {
      const color = this.colors[entry.level];
      return `${color}[${timestamp}] ${level} ${namespace}:${this.reset} ${message}`;
    }

    return `[${timestamp}] ${level} ${namespace}: ${message}`;
  }
}
