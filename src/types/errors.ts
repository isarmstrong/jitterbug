import type { Runtime } from './runtime';

/**
 * Extended error context interface
 */
export interface ErrorContext {
  /**
   * Component stack trace for React errors
   */
  componentStack?: string;

  /**
   * Original error that was wrapped
   */
  originalError?: Error;

  /**
   * Runtime where the error occurred
   */
  runtime?: Runtime;

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
  originalError?: Error;

  metadata: ErrorMetadata;
}

/**
 * Debug data types that can be wrapped as errors
 */
export type DebugData = Error | string | ErrorContext;

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

export const ErrorSeverity = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical'
} as const;

export type ErrorSeverityType = typeof ErrorSeverity[keyof typeof ErrorSeverity];

export const ErrorCategory = {
  Runtime: 'runtime',
  Component: 'component',
  System: 'system',
  Network: 'network'
} as const;

export type ErrorCategoryType = typeof ErrorCategory[keyof typeof ErrorCategory];

export interface ErrorMetadata {
  severity: ErrorSeverityType;
  category: ErrorCategoryType;
  timestamp: number;
  source?: string;
}
