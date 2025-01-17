import type { LogEntry, LogProcessor, RuntimeType } from "../types/types.js";
import { Runtime } from "../types/enums.js";

/**
 * Sanitize processor configuration
 */
export interface SanitizeConfig {
  sensitiveKeys?: string[];
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

  constructor(config?: SanitizeConfig) {
    this.config = {
      sensitiveKeys: config?.sensitiveKeys ?? this.defaultSensitiveKeys,
      replacement: config?.replacement ?? "[REDACTED]",
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

  public async process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T>> {
    if (!entry.data) return entry;

    const sanitizedData = this.sanitizeObject(entry.data);
    return {
      ...entry,
      data: sanitizedData as T,
    };
  }

  private sanitizeObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveKey(key)) {
        result[key] = this.config.replacement;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private isSensitiveKey(key: string): boolean {
    return this.config.sensitiveKeys.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase()),
    );
  }
}
