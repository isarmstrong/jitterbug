import { GUI_DEFAULTS } from '../config/defaults';
import type { LogEntry } from '../types';

export interface GUITransportConfig {
    maxEntries?: number;
    bufferSize?: number;
    autoReconnect?: boolean;
    defaultFilters?: Record<string, boolean>;
}

export interface GUITransportState {
    entries: LogEntry[];
    filters: Record<string, boolean>;
}

export class GUITransport {
    public config: Required<GUITransportConfig>;
    private state: GUITransportState = {
        entries: [],
        filters: {}
    };
    private callbacks: Set<(state: GUITransportState) => void> = new Set();

    constructor(userConfig: Partial<GUITransportConfig> = {}) {
        // First create a complete config with all defaults
        const defaultConfig: Required<GUITransportConfig> = {
            ...GUI_DEFAULTS
        };

        // Then merge with user config, ensuring all properties are present
        this.config = {
            ...defaultConfig,
            ...userConfig
        };

        // Initialize state with default filters if provided
        this.state = {
            entries: [],
            filters: { ...this.config.defaultFilters }
        };
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