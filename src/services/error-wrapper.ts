import type {
  ErrorContext,
  ExtendedError,
  DebugData,
  ErrorWrapperConfig,
} from "../types/errors.js";
import { RuntimeDetector } from "../utils/runtime-detector.js";
import type { ErrorHandler } from '../types/core';

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
export class ErrorWrapperService implements ErrorHandler {
  private config: Required<ErrorWrapperConfig>;
  private readonly onError: (error: Error) => void;

  constructor(onError: (error: Error) => void, config?: Partial<ErrorWrapperConfig>) {
    this.onError = onError;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Wrap a function to catch and handle errors
   */
  public wrap<T>(fn: () => Promise<T>): Promise<T> {
    return fn().catch((error: unknown) => {
      if (error instanceof Error) {
        this.onError(error);
      } else {
        this.onError(new Error(String(error)));
      }
      throw error;
    });
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
    if ((extendedError.context?.runtime) == null) {
      extendedError.context = {
        ...extendedError.context,
        runtime: RuntimeDetector.detectRuntime(),
      };
    }

    // Format stack trace if configured
    if (
      this.config.maxStackLines !== undefined &&
      error.stack !== undefined &&
      error.stack !== null &&
      typeof error.stack === "string" &&
      error.stack.length > 0
    ) {
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

  /**
   * Wrap debug data as an ExtendedError
   */
  public wrapData(data: DebugData): ExtendedError {
    if (data instanceof Error) {
      return this.wrapError(data);
    }

    if (typeof data === "string") {
      return this.wrapString(data);
    }

    return this.wrapContext(data);
  }
}
