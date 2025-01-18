import { LogEntry, LogTransport, LogContext } from "../types/types.js";
import { Runtime } from "../types/enums.js";
import { EdgeTransport, type EdgeTransportConfig } from "./edge.js";

export interface GUITransportConfig {
  maxEntries?: number;
  defaultFilters?: Record<string, boolean>;
  edge?: EdgeTransportConfig;
}

export interface GUITransportState {
  readonly filters: Readonly<Record<string, boolean>>;
  readonly entries: ReadonlyArray<LogEntry<Record<string, unknown>>>;
  readonly isEdgeConnected: boolean;
}

type CallbackSet<T> = Set<(arg: T) => void>;

/**
 * GUI Transport for displaying log entries in a web interface.
 * @implements {LogTransport}
 */
export class GUITransport implements LogTransport {
  private readonly entries: Array<LogEntry<Record<string, unknown>>> = [];
  private readonly filters: Record<string, boolean> = {};
  private readonly updateCallbacks: CallbackSet<
    Array<LogEntry<Record<string, unknown>>>
  > = new Set();
  private readonly stateUpdateCallbacks: CallbackSet<GUITransportState> =
    new Set();
  private readonly maxEntries: number;
  private readonly edgeTransport?: EdgeTransport;

  constructor(config?: Readonly<GUITransportConfig>) {
    this.maxEntries = config?.maxEntries ?? 1000;
    this.filters = this.validateFilters(config?.defaultFilters ?? {});

    // Initialize EdgeTransport if config is provided
    if (config?.edge) {
      this.edgeTransport = new EdgeTransport(config.edge);
      this.edgeTransport.onUpdate(() => {
        // Sync entries from edge transport
        const edgeEntries = this.edgeTransport!.getEntries();
        for (const entry of edgeEntries) {
          if (!this.entries.includes(entry)) {
            this.entries.push(entry);
          }
        }
        this.trimEntries();
        this.notifyStateUpdate();
        this.notifyUpdate(); // Ensure legacy callbacks are triggered
      });
    }
  }

  /**
   * Write a log entry to the transport.
   * @template T - Type of the log entry data
   * @param {Readonly<LogEntry<T>>} entry - The log entry to write
   * @returns {Promise<void>}
   */
  public async write<T extends Record<string, unknown>>(
    entry: Readonly<LogEntry<T>>,
  ): Promise<void> {
    // Ensure async context and validate entry
    await this.validateEntry(entry);

    const safeEntry: LogEntry<Record<string, unknown>> = {
      ...entry,
      data: entry.data ?? {},
      context: this.validateContext(entry.context),
      error: entry.error ?? undefined,
      warnings: Array.isArray(entry.warnings) ? [...entry.warnings] : [],
    };

    this.entries.push(safeEntry);
    this.trimEntries();

    // Forward to edge transport if available
    if (this.edgeTransport) {
      await this.edgeTransport.write(safeEntry);
    }

    this.notifyStateUpdate();
    this.notifyUpdate(); // Ensure legacy callbacks are triggered
  }

  /**
   * Register a callback for state updates.
   * @param {(state: Readonly<GUITransportState>) => void} callback - The callback to register
   */
  public onStateUpdate(
    callback: (state: Readonly<GUITransportState>) => void,
  ): void {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }
    this.stateUpdateCallbacks.add(callback);
  }

  /**
   * Clean up resources and remove all callbacks.
   */
  public async destroy(): Promise<void> {
    if (this.edgeTransport) {
      await this.edgeTransport.destroy();
    }
    this.updateCallbacks.clear();
    this.stateUpdateCallbacks.clear();
  }

  private notifyStateUpdate(): void {
    const state: GUITransportState = Object.freeze({
      filters: Object.freeze({ ...this.filters }),
      entries: Object.freeze(this.getFilteredEntries()),
      isEdgeConnected: this.edgeTransport?.isConnected ?? false,
    });
    this.stateUpdateCallbacks.forEach((callback): void => callback(state));
  }

  private trimEntries(): void {
    if (
      typeof this.maxEntries === "number" &&
      this.maxEntries > 0 &&
      this.entries.length > this.maxEntries
    ) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  private isValidLogEntry<T extends Record<string, unknown>>(
    entry: unknown,
  ): entry is LogEntry<T> {
    return typeof entry === "object" && entry !== null && !Array.isArray(entry);
  }

  private async validateEntry<T extends Record<string, unknown>>(
    entry: Readonly<LogEntry<T>>,
  ): Promise<void> {
    await Promise.resolve(); // Ensure async context
    if (!this.isValidLogEntry<T>(entry)) {
      throw new Error("Invalid log entry: must be an object");
    }
    if (
      entry.context !== undefined &&
      (entry.context === null || typeof entry.context !== "object")
    ) {
      throw new Error(
        "Invalid log entry: context must be an object if provided",
      );
    }
    if (
      entry.data !== undefined &&
      (entry.data === null || typeof entry.data !== "object")
    ) {
      throw new Error("Invalid log entry: data must be an object if provided");
    }
  }

  private validateContext(
    context: Readonly<Partial<LogContext>> = {},
  ): LogContext {
    return {
      timestamp: new Date(
        typeof context.timestamp === "number" ? context.timestamp : Date.now(),
      ).toISOString(),
      runtime: context.runtime ?? Runtime.BROWSER,
      environment: context.environment ?? "DEVELOPMENT",
      namespace:
        typeof context.namespace === "string" ? context.namespace : "default",
    };
  }

  private validateFilters(
    filters: Readonly<Record<string, boolean>>,
  ): Record<string, boolean> {
    return Object.entries(filters).reduce(
      (acc, [key, value]) => {
        acc[key] = typeof value === "boolean" ? value : true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  private getFilteredEntries(): Array<LogEntry<Record<string, unknown>>> {
    return this.entries.filter((entry) => {
      const namespace = entry.context?.namespace;
      return (
        typeof namespace === "string" &&
        namespace.length > 0 &&
        this.filters[namespace] !== false
      );
    });
  }

  /**
   * @deprecated Use onStateUpdate instead. This method will be removed in the next major version.
   */
  public onUpdate(
    callback: (entries: Array<LogEntry<Record<string, unknown>>>) => void,
  ): void {
    console.warn(
      "GUITransport.onUpdate is deprecated. Use onStateUpdate instead.",
    );
    this.updateCallbacks.add(callback);
  }

  /**
   * @deprecated Use the new filtering system via onStateUpdate. This method will be removed in the next major version.
   */
  public setFilter(key: string, value: boolean): void {
    console.warn(
      "GUITransport.setFilter is deprecated. Use the new filtering system via onStateUpdate.",
    );
    this.filters[key] = value;
    this.notifyStateUpdate();
  }

  /**
   * @deprecated Use onStateUpdate to receive entries with state updates. This method will be removed in the next major version.
   */
  public getEntries(): Array<LogEntry<Record<string, unknown>>> {
    console.warn(
      "GUITransport.getEntries is deprecated. Use onStateUpdate to receive entries with state updates.",
    );
    return this.getFilteredEntries();
  }

  /**
   * @private
   * @deprecated Internal use only. Will be removed in the next major version.
   */
  private notifyUpdate(): void {
    const filteredEntries = this.getFilteredEntries();
    this.updateCallbacks.forEach((callback): void => callback(filteredEntries));
  }
}
