import type {
  DebugData,
  ErrorContext,
  ErrorMetadata,
  ErrorSeverityType,
  ErrorWrapperConfig,
  ExtendedError
} from "../types/errors.js";
import { ErrorCategory, ErrorSeverity } from "../types/errors.js";
import { RuntimeDetector } from "../utils/runtime-detector.js";

/**
 * Default error wrapper configuration
 */
const DEFAULT_CONFIG: Required<ErrorWrapperConfig> = {
  includeComponentStack: true,
  autoWrapErrors: true,
  maxStackLines: 50,
};

// Define a proper error hierarchy
export class JitterbugError extends Error implements ExtendedError {
  public context?: ErrorContext;
  public metadata: ErrorMetadata;

  constructor(message: string, context?: ErrorContext, severity: ErrorSeverityType = ErrorSeverity.Medium) {
    super(message);
    this.name = 'JitterbugError';
    this.context = context;
    this.metadata = {
      severity,
      category: ErrorCategory.System,
      timestamp: Date.now(),
      source: 'jitterbug'
    };
    Object.setPrototypeOf(this, JitterbugError.prototype);
  }
}

export class RuntimeError extends JitterbugError {
  constructor(message: string, context?: ErrorContext, severity: ErrorSeverityType = ErrorSeverity.High) {
    super(message, context, severity);
    this.name = 'RuntimeError';
    this.metadata.category = ErrorCategory.Runtime;
    Object.setPrototypeOf(this, RuntimeError.prototype);
  }
}

export class ComponentError extends JitterbugError {
  constructor(message: string, context?: ErrorContext, severity: ErrorSeverityType = ErrorSeverity.Medium) {
    super(message, context, severity);
    this.name = 'ComponentError';
    this.metadata.category = ErrorCategory.Component;
    Object.setPrototypeOf(this, ComponentError.prototype);
  }
}

// Type guards for error discrimination
export function isJitterbugError(error: unknown): error is JitterbugError {
  return error instanceof JitterbugError;
}

export function isRuntimeError(error: unknown): error is RuntimeError {
  return error instanceof RuntimeError;
}

export function isComponentError(error: unknown): error is ComponentError {
  return error instanceof ComponentError;
}

/**
 * Error wrapper service implementation
 */
export class ErrorWrapperService {
  private config: Required<ErrorWrapperConfig>;

  constructor(config?: Partial<ErrorWrapperConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Wrap data as an ExtendedError
   */
  wrap(data: DebugData): ExtendedError {
    if (data instanceof Error) {
      return this.wrapError(data);
    }

    if (typeof data === "string") {
      return this.wrapString(data);
    }

    return this.wrapContext(data);
  }

  /**
   * Configure error wrapping behavior
   */
  configure(config: Partial<ErrorWrapperConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Wrap an unknown error into an ExtendedError with proper type checks and null guards
   */
  public wrapError(error: unknown, severity?: ErrorSeverityType): ExtendedError {
    if (error === null || error === undefined) {
      return new JitterbugError('Unknown error: null or undefined', {
        runtime: RuntimeDetector.detectRuntime()
      }, ErrorSeverity.Low);
    }

    if (isJitterbugError(error)) {
      if (severity) {
        error.metadata.severity = severity;
      }
      return error;
    }

    if (error instanceof Error) {
      const context: ErrorContext = {
        originalError: error,
        runtime: RuntimeDetector.detectRuntime(),
        stack: error.stack
      };
      return new RuntimeError(error.message, context, severity || ErrorSeverity.High);
    }

    if (typeof error === 'string') {
      return this.wrapString(error, severity);
    }

    return new JitterbugError('An unknown error occurred', {
      runtime: RuntimeDetector.detectRuntime()
    }, severity || ErrorSeverity.Low);
  }

  /**
   * Wrap an error and attach additional context safely
   */
  public wrapErrorWithContext(error: unknown, context: ErrorContext, severity?: ErrorSeverityType): ExtendedError {
    const wrapped = this.wrapError(error, severity);
    wrapped.context = {
      ...wrapped.context,
      ...context,
      runtime: context.runtime ?? wrapped.context?.runtime ?? RuntimeDetector.detectRuntime()
    };
    return wrapped;
  }

  /**
   * Wrap a string as an Error with proper type safety
   */
  private wrapString(message: string, severity?: ErrorSeverityType): ExtendedError {
    if (!message || typeof message !== 'string') {
      return new JitterbugError('Invalid message provided', {
        runtime: RuntimeDetector.detectRuntime()
      }, ErrorSeverity.Low);
    }

    return new JitterbugError(message, {
      message,
      runtime: RuntimeDetector.detectRuntime()
    }, severity || ErrorSeverity.Medium);
  }

  private isErrorContext(context: unknown): context is ErrorContext {
    return typeof context === 'object' && context !== null && !Array.isArray(context);
  }

  /**
   * Wrap an error context object with proper type validation
   */
  private wrapContext(context: ErrorContext): ExtendedError {
    if (!this.isErrorContext(context)) {
      return new JitterbugError('Invalid context provided', {
        runtime: RuntimeDetector.detectRuntime()
      }, ErrorSeverity.Low);
    }

    const safeContext: ErrorContext = {
      ...context,
      runtime: context.runtime ?? RuntimeDetector.detectRuntime()
    };

    return new JitterbugError('Debug context', safeContext, ErrorSeverity.Medium);
  }

  /**
   * Get a safe error message with proper type checking
   */
  private getErrorMessage(error: unknown): string {
    if (error === undefined || error === null) {
      return "Unknown error occurred";
    }

    if (error instanceof Error) {
      const msg = error.message;
      if (msg === undefined || msg === null || typeof msg !== "string" || msg.length === 0) {
        return "Unknown error occurred";
      }
      return msg;
    }

    return "Unknown error occurred";
  }
}
