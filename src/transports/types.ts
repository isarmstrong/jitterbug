import {
  type LogEntry,
  type LogLevel,
  LogLevels,
  type LogTransport,
} from "../types";
import { ValidationResult } from "../types/ebl/core";

/**
 * Transport configuration interface
 */
export interface TransportConfig {
  enabled?: boolean;
  level?: LogLevel;
  format?: "pretty" | "json";
}

/**
 * Transport base class
 */
export abstract class BaseTransport implements LogTransport {
  protected config: Required<TransportConfig>;

  constructor(config: TransportConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      level: config.level ?? LogLevels.INFO,
      format: config?.format ?? "pretty",
    };
  }

  abstract write<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void>;

  protected shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels = Object.values(LogLevels);
    const configLevel = this.config.level.toUpperCase() as keyof typeof LogLevels;
    const entryLevel = level.toUpperCase() as keyof typeof LogLevels;

    const configIndex = levels.indexOf(configLevel);
    const messageIndex = levels.indexOf(entryLevel);
    return messageIndex >= configIndex;
  }

  protected formatEntry<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): string {
    if (this.config.format === "json") {
      return JSON.stringify(entry);
    }

    const timestamp = new Date(Number(entry.context?.timestamp ?? 0)).toISOString();
    const level = entry.level.padEnd(5);
    const namespace = String(entry.context?.namespace ?? "");
    const message = entry.message;

    // Format context data if available
    const contextData = entry.context ? ` ${JSON.stringify(entry.context)}` : "";

    return `[${timestamp}] ${level} ${namespace}: ${message}${contextData}`;
  }

  protected validateEntry<T extends Record<string, unknown>>(entry: LogEntry<T>): ValidationResult {
    if (!entry) {
      return {
        isValid: false,
        errors: ['Entry cannot be null or undefined']
      };
    }

    if (!entry.level || !Object.values(LogLevels).includes(entry.level.toUpperCase() as keyof typeof LogLevels)) {
      return {
        isValid: false,
        errors: ['Invalid log level']
      };
    }

    return { isValid: true };
  }
}
