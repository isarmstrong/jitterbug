import type { RuntimeType, EnvironmentType } from "../types.js";
import { Runtime, Environment } from "../types";

/**
 * Runtime detection utility
 */
export class RuntimeDetector {
  /**
   * Detect the current runtime environment
   */
  static detectRuntime(): RuntimeType {
    // Check for Edge Runtime first as it's most specific
    if (typeof EdgeRuntime === "string") {
      return Runtime.EDGE;
    }

    // Then check for Browser environment
    if (
      typeof window === "object" &&
      window !== null &&
      typeof window.document === "object" &&
      window.document !== null &&
      "createElement" in window.document
    ) {
      return Runtime.BROWSER;
    }

    // Check for Node.js environment with multiple indicators
    if (
      // Check for process object and versions
      (typeof process === "object" &&
        process !== null &&
        typeof process.versions === "object" &&
        process.versions !== null &&
        typeof process.versions.node === "string" &&
        process.versions.node.length > 0) ||
      // Additional Node.js indicators
      (typeof process === "object" &&
        process !== null &&
        typeof process.env === "object" &&
        process.env !== null &&
        typeof process.pid === "number")
    ) {
      return Runtime.NODE;
    }

    // Default to Node if no other runtime is detected
    // This is safer as Edge should be explicitly detectable
    return Runtime.NODE;
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
