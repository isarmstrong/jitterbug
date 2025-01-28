import { LogLevels } from "../types/core";
import type { LogEntry, LogLevel, LogTransport } from "../types/core";
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
  private readonly methods = {
    [LogLevels.DEBUG]: 'debug',
    [LogLevels.INFO]: 'info',
    [LogLevels.WARN]: 'warn',
    [LogLevels.ERROR]: 'error',
    [LogLevels.FATAL]: 'error'
  } as const;

  constructor(config?: ConsoleConfig) {
    super(config);
    this.config = {
      ...this.config,
      colors: config?.colors ?? (typeof window === 'undefined'), // Disable colors in browser by default
    };
  }

  private getLogFunction(level: LogLevel): (message: string, ...args: unknown[]) => void {
    const upperLevel = level.toUpperCase() as keyof typeof LogLevels;
    const method = this.methods[upperLevel];
    return console[method].bind(console);
  }

  public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logFn = this.getLogFunction(entry.level);
    const timestamp = entry.context?.timestamp ?? new Date().toISOString();
    const namespace = entry.context?.namespace ?? 'default';

    // Format error if present
    if (entry.error instanceof Error) {
      logFn(`[${timestamp}] [${namespace}] ${entry.level}: ${entry.message}`);
      logFn(`Error: ${entry.error.message}`);
      if (entry.data) {
        logFn('Additional data:', entry.data);
      }
      return;
    }

    // Format data if present
    if (entry.data) {
      logFn(`[${timestamp}] [${namespace}] ${entry.level}: ${entry.message}`, entry.data);
      return;
    }

    // Basic log format
    logFn(`[${timestamp}] [${namespace}] ${entry.level}: ${entry.message}`);
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
