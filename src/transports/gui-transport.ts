import { GUI_DEFAULTS } from '../config/defaults';
import type { LogEntry } from '../types/core';
import { BaseTransport } from './types';

export interface GUITransportConfig {
    maxEntries?: number;
    bufferSize?: number;
    autoReconnect?: boolean;
    defaultFilters?: Record<string, boolean>;
}

export interface GUITransportState {
    entries: LogEntry<Record<string, unknown>>[];
    filters: Record<string, boolean>;
}

export class GUITransport extends BaseTransport {
    protected readonly transportConfig: Required<GUITransportConfig>;
    private state: GUITransportState = {
        entries: [],
        filters: {}
    };
    private callbacks: Set<(state: GUITransportState) => void> = new Set();

    constructor(userConfig: Partial<GUITransportConfig> = {}) {
        super();
        // First create a complete config with all defaults
        const defaultConfig: Required<GUITransportConfig> = {
            ...GUI_DEFAULTS
        };

        // Then merge with user config, ensuring all properties are present
        this.transportConfig = {
            ...defaultConfig,
            ...userConfig
        };

        // Initialize state with default filters if provided
        this.state = {
            entries: [],
            filters: { ...this.transportConfig.defaultFilters }
        };
    }

    public async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        // Add the entry to our state
        this.state.entries.push(entry as LogEntry<Record<string, unknown>>);

        // Trim entries if we exceed maxEntries
        if (this.transportConfig.maxEntries > 0 && this.state.entries.length > this.transportConfig.maxEntries) {
            this.state.entries = this.state.entries.slice(-this.transportConfig.maxEntries);
        }

        // Notify all callbacks of the state change
        this.notifyCallbacks();
    }

    public onStateUpdate(callback: (state: GUITransportState) => void): void {
        this.callbacks.add(callback);
        callback(this.state);
    }

    public setFilter(namespace: string, value: boolean): void {
        this.state.filters[namespace] = value;
        this.notifyCallbacks();
    }

    public destroy(): Promise<void> {
        this.callbacks.clear();
        return Promise.resolve();
    }

    private notifyCallbacks(): void {
        this.callbacks.forEach(callback => callback(this.state));
    }
} 