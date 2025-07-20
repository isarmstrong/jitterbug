/**
 * Orchestrator Error Hierarchy
 * 
 * All internal orchestrator errors must extend BaseOrchestratorError.
 * Raw Error throws are a lint violation within orchestrator modules.
 */

/**
 * Base class for all orchestrator errors with categorization and retry semantics
 */
export abstract class BaseOrchestratorError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly category: string;
  readonly timestamp: number;

  constructor(
    message: string, 
    code: string, 
    category: string,
    retryable = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.timestamp = Date.now();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging/telemetry
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Configuration errors - missing env vars, invalid schema, etc.
 * Never retryable as they indicate setup issues.
 */
export class ConfigurationError extends BaseOrchestratorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG', 'config', false);
    if (details) {
      Object.assign(this, { details });
    }
  }
}

/**
 * Dependency errors - external services, network issues, etc.
 * Retryable with bounded backoff.
 */
export class DependencyError extends BaseOrchestratorError {
  readonly service?: string;
  readonly statusCode?: number;

  constructor(
    message: string, 
    service?: string, 
    statusCode?: number,
    retryable = true
  ) {
    super(message, 'DEPENDENCY', 'dependency', retryable);
    this.service = service;
    this.statusCode = statusCode;
  }
}

/**
 * Transient errors - network jitter, temporary unavailability, etc.
 * Retryable with exponential backoff.
 */
export class TransientError extends BaseOrchestratorError {
  readonly attempt?: number;

  constructor(message: string, attempt?: number) {
    super(message, 'TRANSIENT', 'transient', true);
    this.attempt = attempt;
  }
}

/**
 * Logic/invariant errors - internal contract breaches, unexpected states, etc.
 * Never retryable as they indicate bugs.
 */
export class InvariantError extends BaseOrchestratorError {
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INVARIANT', 'logic', false);
    this.context = context;
  }
}

/**
 * Cancellation errors - propagated abort signals, user cancellation, etc.
 * Not retryable as cancellation is intentional.
 */
export class CancelledError extends BaseOrchestratorError {
  readonly reason?: string;

  constructor(message: string, reason?: string) {
    super(message, 'CANCELLED', 'cancellation', false);
    this.reason = reason;
  }
}

/**
 * Validation errors - invalid input, schema mismatches, etc.
 * Not retryable as they indicate client-side issues.
 */
export class ValidationError extends BaseOrchestratorError {
  readonly field?: string;
  readonly received?: unknown;
  readonly expected?: string;

  constructor(
    message: string, 
    field?: string, 
    received?: unknown, 
    expected?: string
  ) {
    super(message, 'VALIDATION', 'validation', false);
    this.field = field;
    this.received = received;
    this.expected = expected;
  }
}

/**
 * Type guard to check if error is an orchestrator error
 */
export function isOrchestratorError(error: unknown): error is BaseOrchestratorError {
  return error instanceof BaseOrchestratorError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return isOrchestratorError(error) && error.retryable;
}

/**
 * Extract error metrics for telemetry
 */
export function getErrorMetrics(error: unknown) {
  if (isOrchestratorError(error)) {
    return {
      category: error.category,
      code: error.code,
      retryable: error.retryable,
      name: error.name,
    };
  }
  
  return {
    category: 'unknown',
    code: 'UNKNOWN',
    retryable: false,
    name: error instanceof Error ? error.constructor.name : 'Unknown',
  };
}