import type { LogEntry, LogTransport, LogContext } from "../types/core";
import { isNonNullObject, isNonEmptyString, toSafeString } from "../types/guards";

export abstract class BaseTransport implements LogTransport {
    abstract write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;

    protected formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
        // Type guard for context
        const hasValidContext = (ctx: unknown): ctx is LogContext => {
            return isNonNullObject(ctx);
        };

        // Safe timestamp extraction
        const timestamp = hasValidContext(entry.context) && isNonEmptyString(entry.context.timestamp)
            ? entry.context.timestamp
            : new Date().toISOString();

        const level = entry.level.toUpperCase();

        // Safe namespace extraction
        const namespace = hasValidContext(entry.context) && isNonEmptyString(entry.context.namespace)
            ? entry.context.namespace
            : 'default';

        // Safe data stringification
        const data = entry.data !== undefined && entry.data !== null
            ? ` ${toSafeString(entry.data)}`
            : '';

        // Safe error stack extraction
        const error = entry.error?.stack
            ? `\n${entry.error.stack}`
            : '';

        return `[${timestamp}] ${level} ${namespace}: ${entry.message}${data}${error}`;
    }
}

