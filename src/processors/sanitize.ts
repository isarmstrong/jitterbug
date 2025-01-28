import type { LogEntry, LogProcessor, RuntimeType } from "../types/core";
import { Runtime } from "../types/core";

/**
 * Pattern to match for sanitization
 */
export type SanitizePattern = string | RegExp;

/**
 * Sanitize processor configuration for v2
 */
export interface SanitizeConfigV2 {
  /**
   * Patterns to match for sanitization
   * @example ['password', 'token', /secret/i]
   */
  patterns: SanitizePattern[];

  /**
   * Value to replace sensitive data with
   * @default "[REDACTED]"
   */
  replacement?: string;

  /**
   * Whether to recursively sanitize arrays
   * @default false
   */
  sanitizeArrays?: boolean;
}

/**
 * @deprecated Use SanitizeConfigV2 instead
 */
export interface SanitizeConfig {
  /**
   * @deprecated Since version 1.1.0. The default sensitive keys list will be removed in version 2.0.0.
   * Please explicitly provide sensitive keys to ensure proper data sanitization.
   */
  sensitiveKeys?: SanitizePattern[];
  replacement?: string;
  /**
   * @since 1.1.0
   * @default false
   * Controls whether arrays should be recursively sanitized.
   */
  sanitizeArrays?: boolean;
  maxDepth?: number;
  maxLength?: number;
}

/**
 * Sanitize processor implementation
 */
export class SanitizeProcessor implements LogProcessor {
  private readonly patterns: SanitizePattern[];
  private readonly maxDepth: number;
  private readonly maxLength: number;
  private readonly replacement: string;
  private readonly sanitizeArrays: boolean;

  constructor(config: SanitizeConfig = {}) {
    this.patterns = config.sensitiveKeys ?? [
      "password",
      "token",
      "secret",
      "key",
      "auth",
      "credentials",
      "private"
    ];
    this.maxDepth = config.maxDepth ?? 10;
    this.maxLength = config.maxLength ?? 1000;
    this.replacement = config.replacement ?? "[REDACTED]";
    this.sanitizeArrays = config.sanitizeArrays ?? false;
  }

  supports(runtime: RuntimeType): boolean {
    return (
      runtime === Runtime.NODE ||
      runtime === Runtime.EDGE ||
      runtime === Runtime.BROWSER
    );
  }

  allowedIn(): boolean {
    return true;
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    return {
      level: entry.level,
      message: entry.message,
      data: entry.data ? this.sanitizeObject(entry.data as Record<string, unknown>) as T : entry.data,
      error: entry.error,
      context: entry.context,
      warnings: entry.warnings
    };
  }

  private sanitizeObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
    if (depth >= this.maxDepth) {
      return { "[Max Depth Exceeded]": true };
    }

    if (!obj || typeof obj !== "object") {
      return {};
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveKey(key)) {
        result[key] = this.replacement;
        continue;
      }

      if (typeof value === "string") {
        result[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        result[key] = this.sanitizeArrays
          ? value.map(item =>
            typeof item === "object" && item !== null
              ? this.sanitizeObject(item as Record<string, unknown>, depth + 1)
              : item
          )
          : value;
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>, depth + 1);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private sanitizeString(str: string): string {
    if (str.length > this.maxLength) {
      return str.slice(0, this.maxLength) + "...";
    }
    return str;
  }

  private isSensitiveKey(key: string): boolean {
    return this.patterns.some(pattern =>
      typeof pattern === "string"
        ? key.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(key)
    );
  }
}
