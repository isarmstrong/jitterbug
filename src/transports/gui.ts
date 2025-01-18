import { LogEntry } from '../types/types.js';

export interface GUITransportState {
  filters: Record<string, boolean>;
  entries: Array<LogEntry<Record<string, unknown>>>;
}

export class GUITransport {
  private entries: Array<LogEntry<Record<string, unknown>>> = [];
  private filters: Record<string, boolean> = {};
  private updateCallbacks: Set<(entries: Array<LogEntry<Record<string, unknown>>>) => void> = new Set();
  private stateUpdateCallbacks: Set<(state: GUITransportState) => void> = new Set();

  public write<T extends Record<string, unknown>>(entry: LogEntry<T>): void {
    const safeEntry: LogEntry<Record<string, unknown>> = {
      ...entry,
      data: entry.data ?? {},
      context: entry.context ?? {},
      error: entry.error ?? undefined,
      warnings: entry.warnings ?? [],
    };

    this.entries.push(safeEntry);
    this.notifyUpdate();
  }

  public onUpdate(callback: (entries: Array<LogEntry<Record<string, unknown>>>) => void): void {
    this.updateCallbacks.add(callback);
  }

  public onStateUpdate(callback: (state: GUITransportState) => void): void {
    this.stateUpdateCallbacks.add(callback);
  }

  public setFilter(key: string, value: boolean): void {
    this.filters[key] = value;
    this.notifyStateUpdate();
  }

  public destroy(): void {
    this.updateCallbacks.clear();
    this.stateUpdateCallbacks.clear();
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => callback(this.entries));
  }

  private notifyStateUpdate(): void {
    const state: GUITransportState = {
      filters: this.filters,
      entries: this.entries,
    };
    this.stateUpdateCallbacks.forEach(callback => callback(state));
  }
}
