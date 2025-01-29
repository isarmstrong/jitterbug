import { expect } from "vitest";
import { LogLevels, Environment, Runtime } from "../../src/types/enums";
import type { LogEntry } from "../../src/types/core";

/**
 * Core test type definitions that mirror our production types
 */
interface TestLogContext {
    timestamp: string;
    runtime: Runtime.EDGE;
    environment: Environment.DEVELOPMENT;
    namespace: string;
}

type TestLogEntry<T extends Record<string, unknown>> = Omit<LogEntry<T>, 'context'> & {
    context: TestLogContext;
};

/**
 * Creates a strongly-typed test context
 */
function createTestContext(): TestLogContext {
    return {
        timestamp: new Date().toISOString(),
        runtime: Runtime.EDGE,
        environment: Environment.DEVELOPMENT,
        namespace: "test"
    };
}

/**
 * Creates a test log entry with proper type relationships
 */
export function createTestEntry<T extends Record<string, unknown>>(
    level: LogLevels,
    message: string,
    data: T
): TestLogEntry<T> {
    const entry: TestLogEntry<T> = {
        level,
        message,
        data,
        context: createTestContext()
    };
    return entry;
}

/**
 * Type-safe assertion for test log entries
 */
export function assertLogEntry<T extends Record<string, unknown>>(
    entry: TestLogEntry<T> | undefined,
    level: LogLevels,
    dataCheck: (data: Record<string, unknown>) => boolean
): void {
    if (!entry) {
        throw new Error("Expected log entry to exist");
    }
    expect(entry.level).toBe(level);
    expect(dataCheck(entry.data as Record<string, unknown>)).toBe(true);
}

/**
 * Helper for creating empty test data with proper type inference
 */
export function createEmptyTestData<T extends Record<string, unknown> = Record<string, unknown>>(): T {
    return Object.create(null) as T;
} 
