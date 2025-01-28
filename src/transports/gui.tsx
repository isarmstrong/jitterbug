import type { LogEntry, LogTransport } from '../types/core';
import type { GuiConfig } from './types';

export class GuiTransport implements LogTransport {
  private readonly entries: Array<LogEntry<Record<string, unknown>>> = [];
  private readonly config: Required<GuiConfig>;

  constructor(config: Partial<GuiConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      autoScroll: config.autoScroll ?? true
    };
  }

  public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
    if (this.entries.length >= this.config.maxEntries) {
      this.entries.shift();
    }
    this.entries.push(entry as LogEntry<Record<string, unknown>>);
  }

  public getEntries(): Array<LogEntry<Record<string, unknown>>> {
    return this.entries;
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
