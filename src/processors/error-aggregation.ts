import type { LogEntry, LogProcessor } from "../types/core";
import { Runtime, Environment } from "../types/enums";

interface ErrorData {
  message: string;
  stack?: string;
  name: string;
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export class ErrorAggregationProcessor implements LogProcessor {
  private errors: Map<string, ErrorData> = new Map();

  public supports(runtime: string): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  public allowedIn(environment: string): boolean {
    return environment !== Environment.TEST;
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    if (!entry.error || entry.level !== "ERROR") {
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

    return {
      level: entry.level,
      message: entry.message,
      data: entry.data,
      error: entry.error,
      context: entry.context,
      warnings: entry.warnings
    };
  }

  private getErrorPattern(error: Error): string {
    if (!error.stack) return error.message;

    const stackLines = error.stack.split("\n");
    if (stackLines.length < 2) return error.message;

    // Get the first line of the stack trace that's not the error message
    const firstStackLine = stackLines[1].trim();
    return firstStackLine.replace(/:\d+:\d+\)$/, ")");
  }

  public getAggregatedErrors(): ReadonlyMap<string, ErrorData> {
    return this.errors;
  }
}
