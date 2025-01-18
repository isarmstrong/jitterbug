import { LogEntry, LogProcessor } from '../types/types.js';
import { Runtime, Environment, LogLevels } from '../types/enums.js';

interface ErrorPattern {
  message: string;
  stack?: string;
  frequency: number;
  similarErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
}

interface ErrorData {
  frequency: number;
  similarErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
}

export class ErrorAggregationProcessor implements LogProcessor {
  private patterns: Map<string, ErrorPattern> = new Map();
  private recentErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }> = [];

  public supports(runtime: string): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  public allowedIn(environment: string): boolean {
    return environment !== Environment.TEST;
  }

  public get severity(): string {
    return LogLevels.ERROR;
  }

  private getErrorKey(error: Error): string {
    return `${error.message}${error.stack ?? ''}`;
  }

  private isSimilarError(error1: Error, error2: Error): boolean {
    const message1 = error1.message.toLowerCase();
    const message2 = error2.message.toLowerCase();
    const stack1 = (error1.stack ?? '').toLowerCase();
    const stack2 = (error2.stack ?? '').toLowerCase();

    // Check if messages are similar
    if (message1 === message2) return true;
    if (message1.length > 0 && message2.length > 0 && (message1.includes(message2) || message2.includes(message1))) return true;

    // Check if stack traces have similar patterns
    if (stack1.length > 0 && stack2.length > 0) {
      const lines1 = stack1.split('\n');
      const lines2 = stack2.split('\n');
      const commonLines = lines1.filter(line => lines2.includes(line));
      return commonLines.length > 0;
    }

    return false;
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T & ErrorData>> {
    if (!entry.error) {
      return Promise.resolve(entry as LogEntry<T & ErrorData>);
    }

    const now = Date.now();
    const errorKey = this.getErrorKey(entry.error);

    // Update recent errors
    this.recentErrors.push({
      message: entry.error.message,
      stack: entry.error.stack,
      timestamp: now
    });

    // Keep only errors from the last minute
    this.recentErrors = this.recentErrors.filter(e => now - e.timestamp < 60000);

    // Update error patterns
    let pattern = this.patterns.get(errorKey);
    if (!pattern) {
      pattern = {
        message: entry.error.message,
        stack: entry.error.stack,
        frequency: 0,
        similarErrors: []
      };
      this.patterns.set(errorKey, pattern);
    }

    // Find similar errors
    const similarErrors = this.recentErrors.filter(e =>
      this.isSimilarError(
        { message: e.message, stack: e.stack } as Error,
        entry.error as Error
      )
    );

    pattern.frequency = Math.min(similarErrors.length, 20); // Cap at 20 for burst detection
    pattern.similarErrors = similarErrors.slice(0, 5); // Keep only top 5 similar errors

    return Promise.resolve({
      ...entry,
      data: {
        ...entry.data,
        frequency: pattern.frequency,
        similarErrors: pattern.similarErrors
      }
    } as LogEntry<T & ErrorData>);
  }
}
