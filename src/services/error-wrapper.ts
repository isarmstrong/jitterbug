import type {
  ErrorContext,
  ExtendedError,
  DebugData,
  ErrorWrapperConfig,
} from "../types/errors.js";
import { RuntimeDetector } from "../utils/runtime-detector.js";

/**
 * Default error wrapper configuration
 */
const DEFAULT_CONFIG: Required<ErrorWrapperConfig> = {
  includeComponentStack: true,
  autoWrapErrors: true,
  maxStackLines: 50,
};

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
   * Wrap an existing Error object
   */
  private wrapError(error: Error): ExtendedError {
    const extendedError = error as ExtendedError;

    // Add runtime context if not present
    if (!extendedError.context?.runtime) {
      extendedError.context = {
        ...extendedError.context,
        runtime: RuntimeDetector.detectRuntime(),
      };
    }

    // Format stack trace if configured
    if (this.config.maxStackLines && error.stack) {
      const lines = error.stack.split("\n");
      if (lines.length > this.config.maxStackLines) {
        error.stack = lines
          .slice(0, this.config.maxStackLines)
          .join("\n")
          .concat(
            `\n... ${lines.length - this.config.maxStackLines} more lines`,
          );
      }
    }

    return extendedError;
  }

  /**
   * Wrap a string as an Error
   */
  private wrapString(message: string): ExtendedError {
    const error = new Error(message) as ExtendedError;
    error.context = {
      message,
      runtime: RuntimeDetector.detectRuntime(),
    };
    return error;
  }

  /**
   * Wrap an error context object
   */
  private wrapContext(context: ErrorContext): ExtendedError {
    const error = new Error("Debug context") as ExtendedError;
    error.context = {
      ...context,
      runtime: context.runtime ?? RuntimeDetector.detectRuntime(),
    };
    return error;
  }
}
