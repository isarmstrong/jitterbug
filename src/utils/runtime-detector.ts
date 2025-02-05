import { Environment } from "../types";
import type { EnvironmentType } from "../types.js";
import { Runtime, RuntimeType } from '../types/runtime';

/**
 * Runtime detection utility
 */
export class RuntimeDetector {
  private static runtime: RuntimeType;

  /**
   * Detect the current runtime environment
   */
  static detectRuntime(): RuntimeType {
    if (this.runtime) {
      return this.runtime;
    }

    if (typeof window !== 'undefined') {
      this.runtime = Runtime.BROWSER;
      return this.runtime;
    }

    if (typeof process !== 'undefined' && process.release?.name === 'node') {
      this.runtime = Runtime.NODE;
      return this.runtime;
    }

    // Edge runtime is the default for serverless environments
    this.runtime = Runtime.EDGE;
    return this.runtime;
  }

  public static setRuntime(runtime: RuntimeType): void {
    this.runtime = runtime;
  }

  public static resetRuntime(): void {
    this.runtime = undefined;
  }

  /**
   * Detect the current environment type
   */
  static detectEnvironment(): EnvironmentType {
    if (
      typeof process === "object" &&
      process !== null &&
      typeof process.env === "object" &&
      process.env !== null &&
      typeof process.env.NODE_ENV === "string"
    ) {
      switch (process.env.NODE_ENV) {
        case "development":
          return Environment.DEVELOPMENT;
        case "production":
          return Environment.PRODUCTION;
        case "test":
          return Environment.TEST;
        default:
          return Environment.DEVELOPMENT;
      }
    }
    return Environment.DEVELOPMENT;
  }
}
