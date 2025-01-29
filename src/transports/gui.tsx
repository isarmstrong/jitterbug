import type { LogEntry, LogTransport } from '../types/core';
import type { GuiConfig } from './types';

/**
 * Type-safe GUI transport implementation with proper immutability
 * 
 * Type Invariant: All entries are properly validated before processing
 * This is maintained by:
 * 1. Only processing entries through write() which validates the data
 * 2. Using type-safe methods for all operations
 * 3. Immutable configuration prevents runtime modifications
 */
export class GuiTransport implements LogTransport {
  private readonly entries: Array<Readonly<LogEntry<Record<string, unknown>>>>;
  private readonly config: Readonly<Required<GuiConfig>>;

  constructor(config: Readonly<Partial<GuiConfig>> = {}) {
    this.entries = [];
    this.config = Object.freeze({
      maxEntries: config.maxEntries ?? 1000,
      autoScroll: config.autoScroll ?? true
    });
  }

  /**
   * Writes a log entry with proper type safety
   */
  public async write<T extends Record<string, unknown>>(entry: Readonly<LogEntry<T>>): Promise<void> {
    if (!this.isValidEntry(entry)) {
      return;
    }

    if (this.entries.length >= this.config.maxEntries) {
      this.entries.shift();
    }

    // Create immutable entry with proper type assertions
    const immutableEntry = Object.freeze({
      level: entry.level,
      message: entry.message,
      data: Object.freeze(entry.data as Record<string, unknown>),
      context: entry.context ? Object.freeze(entry.context as Record<string, unknown>) : undefined,
      warnings: entry.warnings ? Object.freeze([...entry.warnings]) : undefined,
      _metadata: entry._metadata ? Object.freeze(entry._metadata as Record<string, unknown>) : undefined,
      error: entry.error
    }) as Readonly<LogEntry<Record<string, unknown>>>;

    this.entries.push(immutableEntry);
  }

  /**
   * Returns a readonly view of all entries
   */
  public getEntries(): ReadonlyArray<Readonly<LogEntry<Record<string, unknown>>>> {
    return Object.freeze([...this.entries]);
  }

  /**
   * Clears all entries
   */
  public clear(): void {
    this.entries.length = 0;
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
}
