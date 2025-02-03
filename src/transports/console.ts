import type { LogEntry, LogTransport } from "../types";
import { LogLevels } from "../types";
import { BaseTransport, type TransportConfig } from "./types";

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
      colors: config?.colors ?? (typeof window === 'undefined'), // Disable colors in browser by default
    };
  }

  async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    const e = entry as unknown as LogEntry<T>;
    const levelKey = e.level.toUpperCase() as keyof typeof LogLevels;
    const method = this.methods[levelKey];

    if (!this.shouldLog(levelKey)) return Promise.resolve();

    const message = this.formatEntry(e);

    if ('error' in e && e.error && e.error instanceof Error) {
      console[method](message, e.error);
    } else if ('data' in e && e.data) {
      console[method](message, e.data);
    } else {
      console[method](message);
    }

    return Promise.resolve();
  }

  protected override formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    const e = entry as unknown as LogEntry<T>;
    const timestamp = e.context && typeof e.context.timestamp === 'string'
      ? new Date(e.context.timestamp).toISOString()
      : 'unknown';
    const levelKey = e.level.toUpperCase() as keyof typeof LogLevels;
    const namespace = e.context && typeof e.context.namespace === 'string'
      ? e.context.namespace
      : 'unknown';
    const message = e.message;
    const errorInfo = 'error' in e && e.error instanceof Error ? ` Error: ${e.error.message}` : '';
    const dataInfo = 'data' in e && e.data ? ` Data: ${JSON.stringify(e.data)}` : '';

    if (this.config.colors) {
      return `${this.colors[levelKey]}[${timestamp}] ${levelKey} ${namespace}:${this.reset} ${message}${errorInfo}${dataInfo}`;
    }

    return `[${timestamp}] ${levelKey} ${namespace}: ${message}${errorInfo}${dataInfo}`;
  }
}
