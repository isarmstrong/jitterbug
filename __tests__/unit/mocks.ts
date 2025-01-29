import { Runtime, Environment } from "../../src/types/enums";
import type { LogEntry, LogProcessor, LogTransport, LogContext, BaseLogContext } from "../../src/types/core";

type ProcessedData = Record<string, unknown> & {
    cache?: Record<string, unknown>;
    _debug?: Record<string, unknown>;
};

export class MockProcessor implements LogProcessor {
    public entries: LogEntry<ProcessedData>[] = [];

    supports(_runtime: Runtime): boolean {
        return true;
    }

    allowedIn(_environment: Environment): boolean {
        return true;
    }

    async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
        // Create a deep copy of the entry to avoid mutation
        const processedEntry: LogEntry<T> = {
            level: entry.level,
            message: entry.message,
            data: entry.data,
            context: entry.context
        };

        // Move cache data from data to context if it exists
        if (processedEntry.context && (entry.data as ProcessedData)?.cache) {
            processedEntry.context = {
                ...processedEntry.context,
                cache: (entry.data as ProcessedData).cache || {}
            };
        }

        // Copy any debug metadata
        const data = entry.data as ProcessedData;
        if (data?._debug && typeof data._debug === 'object' && data._debug !== null) {
            const currentData = processedEntry.data as Record<string, unknown>;
            processedEntry.data = {
                ...currentData,
                _debug: { ...data._debug }
            } as unknown as T;
        }

        // Remove cache from data since it's now in context
        if (processedEntry.data) {
            const { cache, ...rest } = processedEntry.data as ProcessedData;
            processedEntry.data = (Object.keys(rest).length > 0 ? rest : {}) as unknown as T;
        }

        this.entries.push(processedEntry as LogEntry<ProcessedData>);
        return processedEntry;
    }
}

export class MockTransport implements LogTransport {
    public entries: LogEntry<Record<string, unknown>>[] = [];

    async write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> {
        this.entries.push(entry as LogEntry<Record<string, unknown>>);
    }
} 
