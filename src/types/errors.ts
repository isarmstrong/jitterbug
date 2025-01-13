import type { RuntimeType } from "../types";

/**
 * Extended error context interface
 */
export interface ErrorContext extends Record<string, unknown> {
  /**
   * Component stack trace for React errors
   */
  componentStack?: string;

  /**
   * Original error that was wrapped
   */
  originalError?: unknown;

  /**
   * Runtime where the error occurred
   */
  runtime?: RuntimeType;

  /**
   * Additional context specific to the error
   */
  [key: string]: unknown;
}

/**
 * Extended error interface with additional context
 */
export interface ExtendedError extends Error {
  /**
   * Error context containing additional information
   */
  context?: ErrorContext;

  /**
   * Component stack trace for React errors
   */
  componentStack?: string;

  /**
   * Original error that was wrapped
   */
  originalError?: unknown;
}

/**
 * Debug data types that can be wrapped as errors
 */
export type DebugData = ErrorContext | Error | string;

/**
 * Error wrapping configuration
 */
export interface ErrorWrapperConfig {
  /**
   * Whether to include component stack in error context
   * @default true
   */
  includeComponentStack?: boolean;

  /**
   * Whether to automatically wrap error data
   * @default true
   */
  autoWrapErrors?: boolean;

  /**
   * Maximum stack trace lines to include
   * @default 50
   */
  maxStackLines?: number;
}
