import type { LogEntry, LogTransport, LogContext } from "../types/core";
import { isNonNullObject, toSafeString } from "../types/guards";

export abstract class BaseTransport implements LogTransport {
    abstract write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;

    protected formatEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
        // Type guard for context
        const hasValidContext = (ctx: unknown): ctx is LogContext => {
            return isNonNullObject(ctx);
        };

        // Safe timestamp extraction with explicit nullish check
        const timestamp = hasValidContext(entry.context) &&
            entry.context.timestamp !== undefined &&
            entry.context.timestamp !== null &&
            entry.context.timestamp.length > 0
            ? entry.context.timestamp
            : new Date().toISOString();

        const level = entry.level.toUpperCase();

        // Safe namespace extraction with explicit nullish check
        const namespace = hasValidContext(entry.context) &&
            entry.context.namespace !== undefined &&
            entry.context.namespace !== null &&
            entry.context.namespace.length > 0
            ? entry.context.namespace
            : 'default';

        // Safe data stringification with explicit nullish check
        const data = entry.data !== undefined && entry.data !== null
            ? ` ${toSafeString(entry.data)}`
            : '';

        // Safe error stack extraction with explicit nullish check
        const error = entry.error?.stack !== undefined &&
            entry.error.stack !== null &&
            entry.error.stack.length > 0
            ? `\n${entry.error.stack}`
            : '';

        return `[${timestamp}] ${level} ${namespace}: ${entry.message}${data}${error}`;
    }
}

