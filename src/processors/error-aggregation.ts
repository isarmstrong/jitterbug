import type { LogEntry, LogProcessor } from "../types/core";
import { Runtime, Environment, LogLevels, isRuntime, isEnvironment, isLogLevel } from "../types/enums";
import type { RuntimeType, EnvironmentType } from "../types/enums";

interface ErrorData {
  message: string;
  stack?: string;
  name: string;
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

interface AggregatedError extends Error {
  _aggregated: boolean;
  _pattern: string;
  _occurrences: number;
}

/**
 * Processor that aggregates similar errors to detect patterns
 * and reduce noise in error reporting.
 */
export class ErrorAggregationProcessor implements LogProcessor {
  private errors: Map<string, ErrorData> = new Map();

  public supports(runtime: unknown): runtime is RuntimeType {
    return isRuntime(runtime) && (runtime === Runtime.NODE || runtime === Runtime.EDGE);
  }

  public allowedIn(environment: unknown): environment is EnvironmentType {
    return isEnvironment(environment) && environment !== Environment.TEST;
  }

  /**
   * Process a log entry for error aggregation.
   * This method maintains an async signature for consistency with the LogProcessor interface,
   * but performs synchronous processing internally for performance.
   * 
   * Design Pattern: "Async Contract Preservation"
   * - Maintains interface consistency across processors
   * - Allows for future async extensions
   * - Enables processor composition
   */
  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    // Ensure consistent async context even for sync operations
    await Promise.resolve();
    return this.processSync(entry);
  }

  /**
   * Internal synchronous implementation of error processing.
   * Separated to make the sync nature explicit and allow for direct calls when async isn't needed.
   */
  private processSync<T extends Record<string, unknown>>(entry: LogEntry<T>): LogEntry<T> {
    if (!entry.error || !isLogLevel(entry.level) || entry.level !== LogLevels.ERROR) {
      return entry;
    }

    const pattern = this.getErrorPattern(entry.error);
    const errorKey = `${entry.error.name}:${pattern}`;
    const now = new Date().toISOString();

    let errorData = this.errors.get(errorKey);
    if (!errorData) {
      errorData = {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name,
        pattern,
        count: 0,
        firstSeen: now,
        lastSeen: now
      };
    }

    errorData.count++;
    errorData.lastSeen = now;
    this.errors.set(errorKey, errorData);

    // Create a new Error object with aggregation metadata
    const aggregatedError = new Error(entry.error.message) as AggregatedError;
    Object.assign(aggregatedError, entry.error, {
      _aggregated: true,
      _pattern: pattern,
      _occurrences: errorData.count
    });

    // Return a new object to avoid mutating the input
    return {
      ...entry,
      error: aggregatedError
    };
  }

  private getErrorPattern(error: Error): string {
    if (typeof error.stack !== 'string') {
      return error.message;
    }

    const stackLines = error.stack.split("\n");
    if (stackLines.length < 2) {
      return error.message;
    }

    // Get the first line of the stack trace that's not the error message
    const firstStackLine = stackLines[1].trim();
    return firstStackLine.replace(/:\d+:\d+\)$/, ")");
  }

  public getAggregatedErrors(): ReadonlyMap<string, ErrorData> {
    return this.errors;
  }
}
