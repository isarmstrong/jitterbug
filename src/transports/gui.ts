import type { LogEntry, LogTransport } from "../types/index";

export interface GUITransportConfig {
    edge?: {
        enabled?: boolean;
        endpoint?: string;
    };
}

export class GUITransport implements LogTransport {
    private config: GUITransportConfig;

    constructor(config: GUITransportConfig) {
        this.config = config;
    }

    async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        // Dummy implementation: logs the entry to the console
        console.log("GUITransport log entry:", entry);
        return;
    }
} 