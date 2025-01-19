import { LogLevels } from "../types/enums.js";
import type { LogEntry, LogLevel } from "../types/types.js";
import { BaseTransport, type TransportConfig } from "./types.js";
import type { LogTransport } from "../types/types.js";

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
export class ConsoleTransport extends BaseTransport implements LogTransport {
  declare protected config: Required<ConsoleConfig>;
  private readonly colors: Record<keyof typeof LogLevels, string> = {
    DEBUG: "\x1b[36m", // Cyan
    INFO: "\x1b[32m", // Green
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
    FATAL: "\x1b[35m", // Magenta
  };
  private readonly reset = "\x1b[0m";
  private readonly methods: Record<keyof typeof LogLevels, ConsoleMethod> = {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
    FATAL: "error",
  };

  constructor(config?: ConsoleConfig) {
    super(config);
    this.config = {
      ...this.config,
      colors: config?.colors ?? true,
    };
  }

  async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    const level = entry.level.toUpperCase() as keyof typeof LogLevels;
    const color = this.colors[level];
    const method = this.methods[level];

    if (!this.shouldLog(level)) return Promise.resolve();

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
    const timestamp = entry.context.timestamp;
    const level = entry.level.toUpperCase() as keyof typeof LogLevels;
    const namespace = entry.context.namespace;
    const message = entry.message;
    const color = this.colors[level];

    if (this.config.colors) {
      return `${color}[${timestamp}] ${level} ${namespace}:${this.reset} ${message}`;
    }

    return `[${timestamp}] ${level} ${namespace}: ${message}`;
  }
}
