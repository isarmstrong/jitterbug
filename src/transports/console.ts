import type { LogEntry, LogLevel } from "../types/core";
import { AsyncBaseTransport } from "./async-base";
import { LogLevels } from "../types/enums";

/**
 * Type-safe console transport configuration
 */
export interface ConsoleConfig {
  readonly colors?: boolean;
  readonly formatOptions?: Readonly<{
    readonly showTimestamp?: boolean;
    readonly showLevel?: boolean;
    readonly showMetadata?: boolean;
  }>;
}

/**
 * Console transport implementation with proper type safety and immutability
 * 
 * Type Invariant: All log entries are properly validated before processing
 * This is maintained by:
 * 1. Only processing entries through writeToTransport which validates the data
 * 2. Using type-safe console methods based on log level
 * 3. Immutable configuration prevents runtime modifications
 */
export class ConsoleTransport extends AsyncBaseTransport {
  private readonly config: Readonly<Required<ConsoleConfig>>;

  constructor(config: Readonly<ConsoleConfig> = {}) {
    super();
    this.config = Object.freeze({
      colors: config.colors ?? true,
      formatOptions: Object.freeze({
        showTimestamp: config.formatOptions?.showTimestamp ?? true,
        showLevel: config.formatOptions?.showLevel ?? true,
        showMetadata: config.formatOptions?.showMetadata ?? false
      })
    });
  }

  /**
   * Writes a log entry to the console transport.
   * This method maintains an async signature for consistency with the AsyncBaseTransport interface,
   * but performs synchronous console operations internally for performance.
   * 
   * Design Pattern: "Async Contract Preservation"
   * - Maintains interface consistency across transports
   * - Allows for future async extensions (e.g., remote console)
   * - Enables transport composition
   */
  protected override async writeToTransport<T extends Record<string, unknown>>(
    entry: Readonly<LogEntry<T>>
  ): Promise<void> {
    // Ensure consistent async context even for sync operations
    await Promise.resolve();
    return this.writeToConsole(entry);
  }

  /**
   * Internal synchronous implementation of console writing.
   * Separated to make the sync nature explicit and allow for direct calls when async isn't needed.
   */
  private writeToConsole<T extends Record<string, unknown>>(
    entry: Readonly<LogEntry<T>>
  ): void {
    if (!this.isValidEntry(entry)) {
      return;
    }

    const formatted = this.formatEntry(entry);

    // Use type-safe console methods based on log level
    switch (entry.level) {
      case LogLevels.ERROR:
      case LogLevels.FATAL:
        console.error(formatted);
        break;
      case LogLevels.WARN:
        console.warn(formatted);
        break;
      case LogLevels.INFO:
        console.info(formatted);
        break;
      case LogLevels.DEBUG:
      default:
        console.debug(formatted);
    }
  }

  /**
   * Type guard for validating log entries
   */
  private isValidEntry<T extends Record<string, unknown>>(entry: unknown): entry is Readonly<LogEntry<T>> {
    return entry !== null &&
      typeof entry === 'object' &&
      'level' in entry &&
      'message' in entry &&
      typeof (entry as LogEntry<T>).message === 'string';
  }

  /**
   * Formats a log entry with proper type safety
   */
  protected formatEntry<T extends Record<string, unknown>>(entry: Readonly<LogEntry<T>>): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.config.formatOptions.showTimestamp === true) {
      parts.push(new Date().toISOString());
    }

    // Add log level if enabled
    if (this.config.formatOptions.showLevel === true) {
      const level = this.formatLevel(entry.level);
      parts.push(level);
    }

    // Add message
    parts.push(entry.message);

    // Add metadata if enabled and present
    if (this.config.formatOptions.showMetadata === true &&
      entry._metadata !== undefined &&
      entry._metadata !== null) {
      parts.push(JSON.stringify(entry._metadata));
    }

    // Add warnings if present and non-empty
    if (entry.warnings !== undefined &&
      entry.warnings !== null &&
      entry.warnings.length > 0) {
      parts.push(`[Warnings: ${entry.warnings.join(', ')}]`);
    }

    // Add error if present with explicit checks
    if (entry.error !== undefined && entry.error !== null) {
      if (typeof entry.error.message === 'string' && entry.error.message.length > 0) {
        parts.push(entry.error.message);
      }
      if (typeof entry.error.stack === 'string' && entry.error.stack.length > 0) {
        parts.push(entry.error.stack);
      }
    }

    return parts.join(' ');
  }

  /**
   * Formats log level with color support
   */
  private formatLevel(level: LogLevel): string {
    if (this.config.colors !== true) {
      return `[${level}]`;
    }

    // Use ANSI colors for terminal output
    const colors = {
      [LogLevels.ERROR]: '\x1b[31m', // Red
      [LogLevels.FATAL]: '\x1b[31m\x1b[1m', // Bold Red
      [LogLevels.WARN]: '\x1b[33m', // Yellow
      [LogLevels.INFO]: '\x1b[36m', // Cyan
      [LogLevels.DEBUG]: '\x1b[90m' // Gray
    };

    const reset = '\x1b[0m';
    const color = colors[level] ?? colors[LogLevels.DEBUG];
    return `${color}[${level}]${reset}`;
  }
}
