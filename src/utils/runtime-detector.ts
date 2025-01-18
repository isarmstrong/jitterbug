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
    if (typeof window === 'object' && window !== null && typeof window.document === 'object' && window.document !== null && 'createElement' in window.document) {
      return Runtime.BROWSER;
    }

    if (typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string' && process.versions.node.length > 0) {
      return Runtime.NODE;
    }

    return Runtime.EDGE;
  }

  /**
   * Detect the current environment type
   */
  static detectEnvironment(): EnvironmentType {
    if (typeof process === 'object' && process !== null && typeof process.env === 'object' && process.env !== null && typeof process.env.NODE_ENV === 'string') {
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
