import type { LogEntry, LogProcessor, RuntimeType } from "../types/core";
import { Runtime } from "../types/core";

/**
 * Pattern to match for sanitization
 */
export type SanitizePattern = string | RegExp;

/**
 * Brand for sanitized values
 */
declare const sanitizedBrand: unique symbol;
declare const edgeSafeBrand: unique symbol;

/**
 * Base type for sanitized primitive values
 */
export type SanitizedPrimitive = string | number | boolean | null | undefined;

/**
 * Base interface for sanitized data structures
 */
export interface Sanitized {
  readonly __sanitized: true;
}

/**
 * Type for Edge-safe primitive values
 */
export type EdgeSafeValue = SanitizedPrimitive;

/**
 * Interface for Edge-safe objects with proper type inheritance
 */
export interface EdgeSafeObject extends Sanitized {
  readonly __edgeSafe: true;
  [key: string]: EdgeSafeValue | EdgeSafeArray | EdgeSafeObject;
}

/**
 * Type for Edge-safe arrays with proper type inheritance
 */
export interface EdgeSafeArray extends Sanitized {
  readonly __edgeSafe: true;
  readonly length: number;
  [index: number]: EdgeSafeValue | EdgeSafeObject | EdgeSafeArray;
}

/**
 * Type for safe property values that can be assigned
 */
type SafePropertyValue = EdgeSafeValue | EdgeSafeArray | EdgeSafeObject;

/**
 * Type guard to ensure Edge-safe values
 */
export function isEdgeSafe(value: unknown): value is EdgeSafeValue | EdgeSafeObject | EdgeSafeArray {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isEdgeSafe);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isEdgeSafe);
  }
  return false;
}

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

  /**
   * Process a log entry for sanitization with proper type inheritance
   */
  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    await Promise.resolve();

    const sanitizedEntry: LogEntry<T> = {
      ...entry,
      data: this.sanitizeData(entry.data)
    };

    return sanitizedEntry;
  }

  /**
   * Convert Edge-safe object back to original type with proper type inheritance
   */
  private convertToType<T extends Record<string, unknown>>(value: EdgeSafeObject): T {
    if (!this.isEdgeSafeObject(value)) {
      return Object.create(null) as T;
    }

    const result = Object.create(null) as Record<string, SafePropertyValue>;

    for (const [key, val] of Object.entries(value)) {
      if (key === '__sanitized' || key === '__edgeSafe') continue;

      const propertyValue = this.convertToSafeValue(val);
      Object.defineProperty(result, key, {
        value: propertyValue,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }

    // Ensure the result has the required EdgeSafeObject properties
    const safeResult = Object.assign(result, {
      __sanitized: true as const,
      __edgeSafe: true as const,
      [sanitizedBrand]: true as const,
      [edgeSafeBrand]: true as const
    }) as EdgeSafeObject;

    return safeResult as unknown as T;
  }

  /**
   * Convert a value to a safe property value with proper type validation
   */
  private convertToSafeValue(value: unknown): SafePropertyValue {
    // Handle primitive values first
    if (this.isEdgeSafeValue(value)) {
      return this.validateAndConvertValue(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const safeValues = value.map(item => this.convertToSafeValue(item));
      const safeArray = [...safeValues] as Array<EdgeSafeValue | EdgeSafeObject | EdgeSafeArray>;
      const result = Object.create(Array.prototype) as EdgeSafeArray;

      // Copy array elements
      safeArray.forEach((item, index) => {
        result[index] = item;
      });

      // Add required properties
      Object.defineProperties(result, {
        length: {
          value: safeArray.length,
          writable: true,
          enumerable: false,
          configurable: false
        },
        __sanitized: {
          value: true as const,
          writable: false,
          enumerable: true,
          configurable: false
        },
        __edgeSafe: {
          value: true as const,
          writable: false,
          enumerable: true,
          configurable: false
        }
      });

      return result;
    }

    // Handle objects
    if (this.isEdgeSafeObject(value)) {
      const converted = this.convertToType<Record<string, unknown>>(value);
      const result = Object.create(null) as EdgeSafeObject;

      // Copy object properties
      Object.entries(converted).forEach(([key, val]) => {
        if (key !== '__sanitized' && key !== '__edgeSafe') {
          result[key] = val as EdgeSafeValue | EdgeSafeArray | EdgeSafeObject;
        }
      });

      // Add required properties
      Object.defineProperties(result, {
        __sanitized: {
          value: true as const,
          writable: false,
          enumerable: true,
          configurable: false
        },
        __edgeSafe: {
          value: true as const,
          writable: false,
          enumerable: true,
          configurable: false
        }
      });

      return result;
    }

    // Default case for invalid types
    return '[Invalid Type]';
  }

  /**
   * Validate and convert a value to an EdgeSafeValue
   */
  private validateAndConvertValue(value: unknown): EdgeSafeValue {
    if (value === null) return null;
    if (value === undefined) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    return '[Invalid Type]';
  }

  /**
   * Type guard for Edge-safe objects
   */
  private isEdgeSafeObject(value: unknown): value is EdgeSafeObject {
    return typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
      && '__edgeSafe' in value
      && '__sanitized' in value
      && (edgeSafeBrand in value)
      && (sanitizedBrand in value);
  }

  /**
   * Type-safe data sanitization with proper inheritance
   */
  private sanitizeData<T extends Record<string, unknown>>(data: unknown): T {
    if (!this.isValidData(data)) {
      return Object.create(null) as T;
    }

    const sanitized = this.sanitizeObject(data);
    return this.convertToType<T>(sanitized);
  }

  /**
   * Type guard for valid data
   */
  private isValidData(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Type guard for Edge-safe values
   */
  private isEdgeSafeValue(value: unknown): value is EdgeSafeValue {
    return value === null || value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean';
  }

  /**
   * Sanitize object with proper type inheritance
   */
  private sanitizeObject(obj: Record<string, unknown>): EdgeSafeObject {
    if (this.maxDepth <= 0) {
      return {
        "[Max Depth Exceeded]": true,
        __sanitized: true,
        __edgeSafe: true,
        [sanitizedBrand]: true,
        [edgeSafeBrand]: true
      } as EdgeSafeObject;
    }

    const sanitized = {
      __sanitized: true,
      __edgeSafe: true,
      [sanitizedBrand]: true,
      [edgeSafeBrand]: true
    } as EdgeSafeObject;

    for (const [key, value] of Object.entries(obj)) {
      if (this.shouldSanitize(key)) {
        Object.defineProperty(sanitized, key, {
          value: this.replacement,
          writable: true,
          enumerable: true,
          configurable: true
        });
        continue;
      }

      if (this.isEdgeSafeValue(value)) {
        const sanitizedValue = typeof value === 'string' && value.length > this.maxLength
          ? value.slice(0, this.maxLength) + "..."
          : value;

        Object.defineProperty(sanitized, key, {
          value: sanitizedValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
        continue;
      }

      if (Array.isArray(value)) {
        const sanitizedArray = this.sanitizeArrays
          ? this.sanitizeArray(value)
          : this.createSafeArray(value);

        Object.defineProperty(sanitized, key, {
          value: sanitizedArray,
          writable: true,
          enumerable: true,
          configurable: true
        });
        continue;
      }

      if (this.isValidData(value)) {
        Object.defineProperty(sanitized, key, {
          value: this.sanitizeObject(value),
          writable: true,
          enumerable: true,
          configurable: true
        });
        continue;
      }

      Object.defineProperty(sanitized, key, {
        value: '[Invalid Type]',
        writable: true,
        enumerable: true,
        configurable: true
      });
    }

    return sanitized;
  }

  /**
   * Create safe array with proper type inheritance
   */
  private createSafeArray(arr: readonly unknown[]): EdgeSafeArray {
    const result = arr.map(item => {
      if (this.isEdgeSafeValue(item)) return item;
      if (Array.isArray(item)) return this.createSafeArray(item);
      if (this.isValidData(item)) return this.sanitizeObject(item);
      return '[Invalid Type]';
    });

    return Object.assign(result, {
      __sanitized: true,
      __edgeSafe: true,
      [sanitizedBrand]: true,
      [edgeSafeBrand]: true
    }) as EdgeSafeArray;
  }

  /**
   * Sanitize array with proper type inheritance
   */
  private sanitizeArray(arr: readonly unknown[]): EdgeSafeArray {
    const result = arr.map(item => {
      if (this.isEdgeSafeValue(item)) return item;
      if (Array.isArray(item)) return this.sanitizeArray(item);
      if (this.isValidData(item)) return this.sanitizeObject(item);
      return '[Invalid Type]';
    });

    return Object.assign(result, {
      __sanitized: true,
      __edgeSafe: true,
      [sanitizedBrand]: true,
      [edgeSafeBrand]: true
    }) as EdgeSafeArray;
  }

  private shouldSanitize(key: string): boolean {
    return this.patterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(key);
      }
      return pattern === key;
    });
  }
}
