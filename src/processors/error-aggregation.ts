import { LogProcessor, LogEntry } from "../types/types.js";
import { Runtime, Environment, LogLevels } from "../types/enums.js";
import { createHash } from "crypto";

interface ErrorAggregationConfig {
  maxErrors?: number;
  similarityThreshold?: number;
  burstThreshold?: number;
  burstWindow?: number;
}

interface ErrorPattern {
  count: number;
  group: string;
  errors: Array<{ message: string; timestamp: number }>;
  lastOccurrence: number;
  similarErrors: Array<{ patternId: string; count: number }>;
}

interface ErrorData {
  patternId: string;
  errorGroup: string;
  frequency: number;
  similarErrors: Array<{ patternId: string; count: number }>;
}

export class ErrorAggregationProcessor implements LogProcessor {
  private patterns: Map<string, ErrorPattern> = new Map();
  private readonly maxErrors: number;
  private readonly similarityThreshold: number;
  private readonly burstThreshold: number;
  private readonly burstWindow: number;

  constructor(config: ErrorAggregationConfig = {}) {
    this.maxErrors = config.maxErrors || 100;
    this.similarityThreshold = config.similarityThreshold || 0.8;
    this.burstThreshold = config.burstThreshold || 5;
    this.burstWindow = config.burstWindow || 60000; // 1 minute
  }

  public supports(runtime: string): boolean {
    return runtime === Runtime.NODE || runtime === Runtime.EDGE;
  }

  public allowedIn(environment: string): boolean {
    return environment !== Environment.TEST;
  }

  public get severity(): string {
    return LogLevels.ERROR;
  }

  private generatePatternId(error: Error): string {
    const normalizedMessage = this.normalizeErrorMessage(error.message, false);
    return createHash("sha256")
      .update(`${error.name}:${normalizedMessage}`)
      .digest("hex");
  }

  private generateErrorGroup(error: Error): string {
    const normalizedMessage = this.normalizeErrorMessage(error.message, true);
    return createHash("sha256")
      .update(`${error.name}:${normalizedMessage}`)
      .digest("hex");
  }

  private normalizeErrorMessage(message: string, forGroup: boolean): string {
    let normalized = message;

    // Replace numeric values with 'X'
    normalized = normalized.replace(/\d+/g, "X");

    if (forGroup) {
      // Replace quoted strings with 'VALUE'
      normalized = normalized.replace(/'[^']*'|"[^"]*"/g, "VALUE");

      // Replace hexadecimal IDs with 'ID'
      normalized = normalized.replace(/[0-9a-f]{8,}/gi, "ID");

      // Replace variable parts with generic terms
      normalized = normalized.replace(
        /\b(?:id|key|name|path|url)\b=\S+/gi,
        "$1=VALUE",
      );

      // Replace timestamps and dates
      normalized = normalized.replace(
        /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/g,
        "DATETIME",
      );
    }

    return normalized;
  }

  private findSimilarPatterns(error: Error, currentPatternId: string): string[] {
    const similarPatterns: string[] = [];
    const normalizedMessage = this.normalizeErrorMessage(error.message, true);

    for (const [patternId, pattern] of this.patterns.entries()) {
      if (patternId === currentPatternId) continue;

      const similarity = this.calculateSimilarity(
        normalizedMessage,
        pattern.errors[0]?.message || "",
      );

      if (similarity >= this.similarityThreshold) {
        similarPatterns.push(patternId);
      }
    }

    return similarPatterns;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  private updateErrorPattern(
    patternId: string,
    error: Error,
    timestamp: number,
  ): void {
    const pattern = this.patterns.get(patternId) || {
      count: 0,
      group: this.generateErrorGroup(error),
      errors: [],
      lastOccurrence: timestamp,
      similarErrors: [],
    };

    pattern.count++;
    pattern.lastOccurrence = timestamp;
    pattern.errors.push({
      message: error.message,
      timestamp,
    });

    // Find and update similar errors
    const similarPatterns = this.findSimilarPatterns(error, patternId);
    pattern.similarErrors = similarPatterns.map(id => ({
      patternId: id,
      count: this.patterns.get(id)?.count || 0,
    }));

    // Keep only the last maxErrors
    if (pattern.errors.length > this.maxErrors) {
      pattern.errors = pattern.errors.slice(-this.maxErrors);
    }

    // Clean up old errors outside the burst window
    const cutoff = timestamp - this.burstWindow;
    pattern.errors = pattern.errors.filter(e => e.timestamp > cutoff);

    this.patterns.set(patternId, pattern);
  }

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T & ErrorData>> {
    if (!entry.error) {
      return entry as LogEntry<T & ErrorData>;
    }

    const timestamp = Date.now();
    const patternId = this.generatePatternId(entry.error);
    this.updateErrorPattern(patternId, entry.error, timestamp);
    const pattern = this.patterns.get(patternId)!;

    // Check for error burst
    const recentErrors = pattern.errors.filter(
      e => e.timestamp > timestamp - this.burstWindow,
    );

    const errorData: ErrorData = {
      patternId,
      errorGroup: pattern.group,
      frequency: Math.min(recentErrors.length, 20), // Cap frequency at 20 for burst detection
      similarErrors: pattern.similarErrors.slice(0, 5), // Keep only top 5 similar errors
    };

    return {
      ...entry,
      data: {
        ...entry.data,
        ...errorData,
      } as T & ErrorData,
    };
  }
}
