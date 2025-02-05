import { LogEntry, Transport } from "@isarmstrong/jitterbug-core-types";

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'auth', 'credentials'];

export const createSanitizeProcessor = (): Transport => {
    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                result[key] = sanitizeObject(value as Record<string, unknown>);
            } else if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
                result[key] = '[REDACTED]';
            } else {
                result[key] = value;
            }
        }
        return result;
    };

    return {
        write: async <T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> => {
            if (entry.data) {
                entry.data = sanitizeObject(entry.data) as T;
            }

            // Preserve required BaseContext properties
            const sanitizedContext = sanitizeObject(entry.context);
            entry.context = {
                timestamp: entry.context.timestamp,
                runtime: entry.context.runtime,
                environment: entry.context.environment,
                namespace: entry.context.namespace,
                ...sanitizedContext
            };
        }
    };
}; 