import type { LogEntry, LogLevels, LogTransport } from "../types";
import type { EnvironmentType, RuntimeType } from "../types/core";
import { BaseTransport, type TransportConfig } from "./types";

/**
 * Console transport configuration
 */
export interface ConsoleConfig extends TransportConfig {
  /** Enable colored output (default: true in Node.js, false in browser) */
  colors?: boolean;
  /** Custom color scheme for different log levels */
  colorScheme?: Partial<Record<keyof typeof LogLevels, string>>;
  /** Environment-specific formatting options */
  environmentFormatting?: Partial<Record<EnvironmentType, ConsoleFormatting>>;
}

/**
 * Environment-specific console formatting options
 */
export interface ConsoleFormatting {
  /** Include timestamp in output */
  showTimestamp?: boolean;
  /** Include environment name in output */
  showEnvironment?: boolean;
  /** Include runtime type in output */
  showRuntime?: boolean;
  /** Custom prefix for log messages */
  prefix?: string;
  /** Custom date format for timestamps */
  dateFormat?: string;
}

/**
 * Console transport implementation with environment-aware formatting
 */
export class ConsoleTransport extends BaseTransport implements LogTransport {
  declare protected config: Required<ConsoleConfig>;
  private readonly colors: Record<keyof typeof LogLevels, string> = {
    DEBUG: "\x1b[36m", // Cyan
    INFO: "\x1b[32m",  // Green
    WARN: "\x1b[33m",  // Yellow
    ERROR: "\x1b[31m", // Red
    FATAL: "\x1b[35m", // Magenta
  };
  private readonly reset = "\x1b[0m";
  private readonly methods: Record<keyof typeof LogLevels, keyof Pick<Console, 'debug' | 'info' | 'warn' | 'error'>> = {
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
      colors: config?.colors ?? (typeof window === 'undefined'),
      colorScheme: config?.colorScheme ?? {},
      environmentFormatting: config?.environmentFormatting ?? {}
    };
  }

  async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    const e = entry as unknown as LogEntry<T>;
    const levelKey = e.level.toUpperCase() as keyof typeof LogLevels;
    const method = this.methods[levelKey];

    if (!this.shouldLog(levelKey)) return Promise.resolve();

    const message = this.formatEntry(e);

    if ('error' in e && e.error && e.error instanceof Error) {
      (console[method] as Console['error'])(message, e.error);
    } else if ('data' in e && e.data) {
      (console[method] as Console['info'])(message, e.data);
    } else {
      (console[method] as Console['log'])(message);
    }

    return Promise.resolve();
  }

  protected override formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    const e = entry as unknown as LogEntry<T>;
    const environment = e.context?.environment as EnvironmentType;
    const formatting = this.getEnvironmentFormatting(environment);

    const parts: string[] = [];

    if (formatting.showTimestamp) {
      const timestamp = e.context && typeof e.context.timestamp === 'string'
        ? this.formatDate(new Date(e.context.timestamp), formatting.dateFormat)
        : 'unknown';
      parts.push(`[${timestamp}]`);
    }

    if (formatting.showEnvironment && environment) {
      parts.push(`[${environment}]`);
    }

    if (formatting.showRuntime && e.context?.runtime) {
      parts.push(`[${e.context.runtime as RuntimeType}]`);
    }

    const levelKey = e.level.toUpperCase() as keyof typeof LogLevels;
    const namespace = e.context && typeof e.context.namespace === 'string'
      ? e.context.namespace
      : 'unknown';

    if (formatting.prefix) {
      parts.push(formatting.prefix);
    }

    parts.push(`${levelKey} ${namespace}:`);
    parts.push(e.message);

    const errorInfo = 'error' in e && e.error instanceof Error ? ` Error: ${e.error.message}` : '';
    const dataInfo = 'data' in e && e.data ? ` Data: ${JSON.stringify(e.data)}` : '';

    if (this.config.colors) {
      const color = this.config.colorScheme[levelKey] ?? this.colors[levelKey];
      return `${color}${parts.join(' ')}${this.reset}${errorInfo}${dataInfo}`;
    }

    return `${parts.join(' ')}${errorInfo}${dataInfo}`;
  }

  private getEnvironmentFormatting(environment: EnvironmentType): Required<ConsoleFormatting> {
    const defaultFormatting: Required<ConsoleFormatting> = {
      showTimestamp: true,
      showEnvironment: true,
      showRuntime: true,
      prefix: '',
      dateFormat: 'ISO'
    };

    return {
      ...defaultFormatting,
      ...this.config.environmentFormatting[environment]
    };
  }

  private formatDate(date: Date, format: string): string {
    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'UTC':
        return date.toUTCString();
      case 'LOCAL':
        return date.toLocaleString();
      default:
        return date.toISOString();
    }
  }
}
