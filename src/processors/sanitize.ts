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
  sensitiveKeys?: Array<string | RegExp>;
  replacement?: string;
  /**
   * @since 1.1.0
   * @default false
   * Controls whether arrays should be recursively sanitized.
   */
  sanitizeArrays?: boolean;
}

function isLegacyConfig(config: SanitizeConfigV2 | SanitizeConfig): config is SanitizeConfig {
  return 'sensitiveKeys' in config;
}

/**
 * Sanitize processor implementation
 */
export class SanitizeProcessor implements LogProcessor {
  private readonly config: Required<SanitizeConfigV2>;

  /**
   * @deprecated Since version 1.1.0. Will be removed in version 2.0.0.
   */
  private readonly defaultSensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "credentials",
    "private",
  ];

  constructor(config: SanitizeConfigV2 | SanitizeConfig) {
    // Handle legacy config
    if (isLegacyConfig(config)) {
      console.warn(
        'SanitizeConfig is deprecated. Please use SanitizeConfigV2 with "patterns" instead of "sensitiveKeys".'
      );
      this.config = {
        patterns: config.sensitiveKeys ?? [],
        replacement: config.replacement ?? "[REDACTED]",
        sanitizeArrays: config.sanitizeArrays ?? false,
      };
    } else {
      this.config = {
        patterns: config.patterns,
        replacement: config.replacement ?? "[REDACTED]",
        sanitizeArrays: config.sanitizeArrays ?? false,
      };
    }
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

  public process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T>> {
    // Ensure we have a valid data object to work with
    const sourceData = entry.data ?? ({} as T);

    // Type-safe sanitization with runtime validation
    const sanitizedData = this.sanitizeObject(sourceData);

    // Construct new entry with validated data
    return Promise.resolve({
      ...entry,
      data: sanitizedData,
    });
  }

  private sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    // Initialize result with correct type
    const result = Object.create(null) as T;

    for (const [key, value] of Object.entries(obj)) {
      const targetKey = key as keyof T;

      if (this.shouldSanitize(key)) {
        // Handle sensitive data replacement
        result[targetKey] = this.config.replacement as T[keyof T];
      } else if (this.isObject(value)) {
        if (Array.isArray(value)) {
          // Handle arrays with type safety
          result[targetKey] = (
            this.config.sanitizeArrays ? this.sanitizeArray(value) : value
          ) as T[keyof T];
        } else {
          // Recursively sanitize nested objects
          result[targetKey] = this.sanitizeObject(value) as T[keyof T];
        }
      } else {
        // Preserve primitive values
        result[targetKey] = value as T[keyof T];
      }
    }

    return result;
  }

  private sanitizeArray(arr: unknown[]): unknown[] {
    return arr.map((item) => {
      if (Array.isArray(item)) {
        return this.sanitizeArray(item);
      }
      return this.isObject(item) ? this.sanitizeObject(item) : item;
    });
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private shouldSanitize(key: string): boolean {
    return this.config.patterns.some((pattern: SanitizePattern) =>
      typeof pattern === "string"
        ? key.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(key),
    );
  }
}
