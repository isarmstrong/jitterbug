import type {
  LogEntry,
  LogProcessor,
  RuntimeType,
  EnvironmentType,
} from "../types/types";
import { LogLevels, Runtime, Environment } from "../types/enums";

/**
 * Error aggregation processor configuration
 */
export interface ErrorAggregationConfig {
  maxErrors?: number;
  maxStackTraceLines?: number;
  includeTimestamp?: boolean;
}

/**
 * Error aggregation data interface
 */
export interface ErrorAggregationData {
  errorCount: number;
  stackTrace: string;
}

/**
 * Error aggregation processor implementation
 */
export class ErrorAggregationProcessor implements LogProcessor {
  private readonly config: Required<ErrorAggregationConfig>;
  private errors: Array<{
    timestamp: string;
    error: Error;
    count: number;
  }> = [];

  constructor(config?: ErrorAggregationConfig) {
    this.config = {
      maxErrors: config?.maxErrors ?? 100,
      maxStackTraceLines: config?.maxStackTraceLines ?? 10,
      includeTimestamp: config?.includeTimestamp ?? true,
    };
  }

  supports(runtime: RuntimeType): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  allowedIn(environment: EnvironmentType): boolean {
    return (
      environment === Environment.DEVELOPMENT ||
      environment === Environment.TEST
    );
  }

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T & ErrorAggregationData>> {
    if (entry.level !== LogLevels.ERROR && entry.level !== LogLevels.FATAL) {
      return entry as LogEntry<T & ErrorAggregationData>;
    }

    if (!entry.error) {
      return entry as LogEntry<T & ErrorAggregationData>;
    }

    const existingError = this.errors.find((e) =>
      this.isSameError(e.error, entry.error!),
    );

    if (existingError) {
      existingError.count++;
      existingError.timestamp = entry.context.timestamp;
    } else {
      this.errors.push({
        timestamp: entry.context.timestamp,
        error: entry.error,
        count: 1,
      });

      if (this.errors.length > this.config.maxErrors) {
        this.errors.shift();
      }
    }

    return {
      ...entry,
      data: {
        ...entry.data,
        errorCount: this.getErrorCount(entry.error),
        stackTrace: this.formatStackTrace(entry.error),
      },
    } as LogEntry<T & ErrorAggregationData>;
  }

  private isSameError(error1: Error, error2: Error): boolean {
    return (
      error1.message === error2.message &&
      error1.name === error2.name &&
      error1.stack === error2.stack
    );
  }

  private getErrorCount(error: Error): number {
    const existingError = this.errors.find((e) =>
      this.isSameError(e.error, error),
    );
    return existingError?.count ?? 1;
  }

  private formatStackTrace(error: Error): string {
    return error.stack ?? error.message;
  }
}
