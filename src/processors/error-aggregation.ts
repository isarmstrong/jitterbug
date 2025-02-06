import { createHash } from 'crypto';
import type { EnvironmentType, LogEntry, Processor, RuntimeType } from '../types/core';
import { Environment, LogLevels, Runtime } from '../types/core';

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

interface ErrorContext {
  errorId: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  frequency: number;
  firstOccurrence: number;
  lastOccurrence: number;
  metadata?: Record<string, unknown>;
  patternId: string;
  errorGroup: string;
  similarErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
}

interface ErrorGroup {
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  samples: Error[];
}

interface ErrorAggregation {
  [key: string]: ErrorGroup;
}

function generateErrorHash(error: Error): string {
  const hash = createHash('sha256');
  hash.update(error.message);
  if (error.stack) {
    hash.update(error.stack);
  }
  return hash.digest('hex');
}

export class ErrorAggregationProcessor implements Processor {
  private patterns: Map<string, ErrorPattern> = new Map();
  private recentErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }> = [];
  private errorMap: Map<string, ErrorContext> = new Map();
  private readonly supportedRuntimes = new Set<RuntimeType>([
    Runtime.NODE,
    Runtime.EDGE
  ]);
  private readonly supportedEnvironments = new Set<EnvironmentType>([
    Environment.DEVELOPMENT,
    Environment.STAGING,
    Environment.PRODUCTION
  ]);
  private groups: ErrorAggregation = {};
  private readonly maxSamples: number;

  constructor(maxSamples = 10) {
    this.maxSamples = maxSamples;
  }

  public supports(runtime: RuntimeType): boolean {
    return this.supportedRuntimes.has(runtime);
  }

  public allowedIn(environment: EnvironmentType): boolean {
    return this.supportedEnvironments.has(environment);
  }

  public get severity(): string {
    return LogLevels.ERROR;
  }

  private getErrorKey(error: Error): string {
    return `${error.message}${error.stack ?? ""}`;
  }

  private isSimilarError(error1: Error, error2: Error): boolean {
    const message1 = error1.message.toLowerCase();
    const message2 = error2.message.toLowerCase();
    const stack1 = (error1.stack ?? "").toLowerCase();
    const stack2 = (error2.stack ?? "").toLowerCase();

    // Check if messages are similar
    if (message1 === message2) return true;
    if (
      message1.length > 0 &&
      message2.length > 0 &&
      (message1.includes(message2) || message2.includes(message1))
    )
      return true;

    // Check if stack traces have similar patterns
    if (stack1.length > 0 && stack2.length > 0) {
      const lines1 = stack1.split("\n");
      const lines2 = stack2.split("\n");
      const commonLines = lines1.filter((line) => lines2.includes(line));
      return commonLines.length > 0;
    }

    return false;
  }

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>
  ): Promise<LogEntry<T>> {
    if (!entry.error) {
      return entry;
    }

    const error = entry.error;
    const errorType = error.constructor.name;
    const errorMessage = error.message;
    const stackTrace = error.stack;

    // Generate consistent error ID based on type and message
    const errorId = this.generateErrorId(errorType, errorMessage);
    const patternId = this.detectPattern(error);
    const errorGroup = this.groupError(error);

    // Find similar errors
    const now = Date.now();
    this.recentErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: now
    });

    // Keep only errors from the last minute
    this.recentErrors = this.recentErrors.filter(e => now - e.timestamp < 60000);

    // Find similar errors
    const similarErrors = this.recentErrors.filter(e =>
      this.isSimilarError(
        { message: e.message, stack: e.stack } as Error,
        error
      )
    );

    // Update error tracking
    let errorContext = this.errorMap.get(errorId);
    if (!errorContext) {
      errorContext = {
        errorId,
        errorType,
        errorMessage,
        stackTrace,
        frequency: 0,
        firstOccurrence: now,
        lastOccurrence: now,
        metadata: {},
        patternId,
        errorGroup,
        similarErrors: []
      };
      this.errorMap.set(errorId, errorContext);
    }

    // Update frequency and timing
    errorContext.frequency++;
    errorContext.lastOccurrence = now;
    errorContext.similarErrors = similarErrors.slice(0, 5);

    // Extract additional metadata if available
    if (error instanceof Error && 'metadata' in error) {
      errorContext.metadata = {
        ...errorContext.metadata,
        ...(error as { metadata?: Record<string, unknown> }).metadata
      };
    }

    // Merge error data with original entry
    return {
      ...entry,
      level: LogLevels.ERROR,
      context: {
        ...entry.context,
        error: errorContext
      }
    };
  }

  private generateErrorId(errorType: string, message: string): string {
    // Create a stable hash of the error type and message
    const str = `${errorType}:${message}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private detectPattern(error: Error): string {
    const err = error;
    const uniqueId = err.stack
      ? err.stack.split('\n').slice(0, 2).join('|')
      : Math.random().toString(36).slice(2, 6);

    const patternString = `${err.name}:${err.message}:${uniqueId}`;
    let hash = 0;

    for (let i = 0; i < patternString.length; i++) {
      hash = (hash << 5) - hash + patternString.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }

    return `err-${Math.abs(hash)}`;
  }

  private groupError(_error: Error): string {
    return `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  public aggregate(error: Error): void {
    const hash = generateErrorHash(error);

    if (!this.groups[hash]) {
      this.groups[hash] = {
        count: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        samples: []
      };
    }

    const group = this.groups[hash];
    group.count++;
    group.lastSeen = new Date();

    if (group.samples.length < this.maxSamples) {
      group.samples.push(error);
    }
  }

  public getGroups(): ErrorAggregation {
    return { ...this.groups };
  }

  public clear(): void {
    this.groups = {};
  }
}
