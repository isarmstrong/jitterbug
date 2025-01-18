import type { LogEntry, LogProcessor, RuntimeType } from "../types/types.js";
import { Runtime } from "../types/enums.js";

/**
 * Sanitize processor configuration
 */
export interface SanitizeConfig {
  sensitiveKeys: Array<string | RegExp>;
  replacement?: string;
}

/**
 * Sanitize processor implementation
 */
export class SanitizeProcessor implements LogProcessor {
  private readonly config: Required<SanitizeConfig>;
  private readonly defaultSensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "credentials",
    "private",
  ];

  constructor(config: SanitizeConfig) {
    this.config = {
      sensitiveKeys: config.sensitiveKeys,
      replacement: config.replacement ?? '[REDACTED]'
    };
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

  public process<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<LogEntry<T>> {
    const sanitizedData = this.sanitizeObject(entry.data ?? {});
    return Promise.resolve({
      ...entry,
      data: sanitizedData as T
    });
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.shouldSanitize(key)) {
        result[key] = this.config.replacement;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private shouldSanitize(key: string): boolean {
    return this.config.sensitiveKeys.some((pattern: string | RegExp) =>
      typeof pattern === 'string'
        ? key.toLowerCase() === pattern.toLowerCase()
        : pattern.test(key)
    );
  }
}
