import { Environment, Runtime } from '../types/core';
import type { EnvironmentType, LogEntry, Processor, RuntimeType } from '../types/index';

/**
 * Sanitize processor configuration
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

/**
 * Sanitize processor implementation
 */
export class SanitizeProcessor implements Processor {
  private readonly config: Required<SanitizeConfig>;
  private sensitiveKeys: string[];

  private readonly supportedRuntimes = new Set<RuntimeType>([
    Runtime.NODE,
    Runtime.EDGE,
    Runtime.BROWSER
  ]);

  private readonly supportedEnvironments = new Set<EnvironmentType>([
    Environment.DEVELOPMENT,
    Environment.STAGING,
    Environment.PRODUCTION
  ]);

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

  /**
   * Creates a new SanitizeProcessor instance
   * @deprecated Since version 1.1.0. Constructor without explicit sensitiveKeys will be removed in version 2.0.0.
   */
  constructor(config?: SanitizeConfig) {
    this.config = {
      sensitiveKeys: config?.sensitiveKeys ?? this.defaultSensitiveKeys,
      replacement: config?.replacement ?? "[REDACTED]",
      sanitizeArrays: config?.sanitizeArrays ?? false,
    };
    this.sensitiveKeys = this.config.sensitiveKeys as string[];
  }

  public supports(runtime: RuntimeType): boolean {
    return this.supportedRuntimes.has(runtime);
  }

  public allowedIn(environment: EnvironmentType): boolean {
    return this.supportedEnvironments.has(environment);
  }

  public async process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    const data = entry.data ?? {} as T;
    const sanitizedData = this.sanitizeData(data);
    return {
      ...entry,
      data: sanitizedData
    };
  }

  private sanitizeData<T extends Record<string, unknown>>(data: T): T {
    const sanitized = { ...data };
    this.removeSecrets(sanitized);
    this.sanitizeErrors(sanitized);
    return sanitized as T;
  }

  private removeSecrets(obj: Record<string, unknown>): void {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        obj[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        this.removeSecrets(value as Record<string, unknown>);
      }
    }
  }

  private sanitizeErrors(obj: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Error) {
        obj[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      } else if (value && typeof value === 'object') {
        this.sanitizeErrors(value as Record<string, unknown>);
      }
    }
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
    return this.sensitiveKeys.some((pattern: string | RegExp) =>
      typeof pattern === "string"
        ? key.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(key),
    );
  }
}
