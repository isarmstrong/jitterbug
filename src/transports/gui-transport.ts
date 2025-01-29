import type { LogEntry } from "../types/core";
import { AsyncBaseTransport } from "./async-base";
import { isNonEmptyString } from "../types/guards";

export interface GUITransportConfig {
    maxEntries?: number;
    defaultFilters?: Record<string, boolean>;
    namespace?: string;
}

export interface GUITransportState {
    entries: LogEntry<Record<string, unknown>>[];
    filters: Record<string, boolean>;
}

export class GUITransport extends AsyncBaseTransport {
    private state: GUITransportState;
    private readonly config: Required<GUITransportConfig>;
    private callbacks: Set<(state: GUITransportState) => void> = new Set();

    constructor(config: GUITransportConfig = {}) {
        super();
        this.config = {
            maxEntries: config.maxEntries ?? 1000,
            defaultFilters: config.defaultFilters ?? {},
            namespace: config.namespace ?? 'default'
        };

        this.state = {
            entries: [],
            filters: { ...this.config.defaultFilters }
        };
    }

    protected async writeToTransport<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        // Add the entry to our state
        this.state.entries.push(entry as LogEntry<Record<string, unknown>>);

        // Trim entries if we exceed maxEntries
        if (this.config.maxEntries > 0 && this.state.entries.length > this.config.maxEntries) {
            this.state.entries = this.state.entries.slice(-this.config.maxEntries);
        }

        // Notify all callbacks of the state change
        this.notifyCallbacks();
    }

    public onStateUpdate(callback: (state: GUITransportState) => void): () => void {
        this.callbacks.add(callback);
        callback(this.state);
        return () => {
            this.callbacks.delete(callback);
        };
    }

    public setFilter(namespace: string, value: boolean): void {
        if (!isNonEmptyString(namespace)) return;
        this.state.filters[namespace] = value;
        this.notifyCallbacks();
    }

    protected override async cleanup(): Promise<void> {
        this.callbacks.clear();
        this.state.entries = [];
        await super.cleanup();
    }

    private notifyCallbacks(): void {
        const state = {
            entries: [...this.state.entries],
            filters: { ...this.state.filters }
        };
        this.callbacks.forEach(callback => callback(state));
    }
} 