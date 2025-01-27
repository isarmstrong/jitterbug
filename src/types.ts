/**
 * Re-export all types from the consolidated type system
 * @see docs/type-system-analysis.md for details on the type system architecture
 */
export * from './types/core';

export interface LogEntry<T extends Record<string, unknown> = Record<string, unknown>> {
    level: string;
    message: string;
    context?: T;
    _metadata?: {
        queueTime: number;
        sequence: number;
        _size: number;
    };
}