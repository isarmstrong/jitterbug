import type { RuntimeType, EnvironmentType } from "../types.js";
import { Runtime, Environment } from "../types/enums.js";

/**
 * Runtime detection utility
 */
export class RuntimeDetector {
  /**
   * Detect the current runtime environment
   */
  static detectRuntime(): RuntimeType {
    if (typeof EdgeRuntime !== "undefined") {
      return Runtime.EDGE;
    }

    if (
      typeof window !== "undefined" &&
      typeof window.document !== "undefined" &&
      typeof window.document.createElement !== "undefined"
    ) {
      return Runtime.BROWSER;
    }

    return Runtime.NODE;
  }

  /**
   * Detect the current environment type
   */
  static detectEnvironment(): EnvironmentType {
    if (typeof process !== "undefined" && process.env) {
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
