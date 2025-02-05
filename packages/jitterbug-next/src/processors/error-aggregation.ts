import { LogEntry, Transport } from "@isarmstrong/jitterbug-core-types";

export const createErrorAggregationProcessor = (): Transport => {
    const errorMap = new Map<string, number>();

    return {
        write: async <T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void> => {
            if (!entry.error) return;

            const errorKey = entry.error.message;
            const count = (errorMap.get(errorKey) || 0) + 1;
            errorMap.set(errorKey, count);

            Object.assign(entry.context, {
                errorAggregation: {
                    count,
                    firstSeen: errorMap.has(errorKey) ? entry.context.timestamp : undefined
                }
            });
        }
    };
}; 