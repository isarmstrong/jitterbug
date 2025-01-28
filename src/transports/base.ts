import type { LogEntry, LogTransport } from "../types/core";

export abstract class BaseTransport implements LogTransport {
    abstract write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;

    protected formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
        const timestamp = entry.context?.timestamp ?? new Date().toISOString();
        const level = entry.level.toUpperCase();
        const namespace = entry.context?.namespace ?? 'default';
        const message = entry.message;
        const data = entry.data ? JSON.stringify(entry.data) : "";
        const error = entry.error ? `\n${entry.error.stack}` : "";

        return `[${timestamp}] ${level} ${namespace}: ${message}${data}${error}`;
    }
} 

