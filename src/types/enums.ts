/**
 * Core log levels supported by Jitterbug
 */
export const LogLevels = Object.freeze({
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  FATAL: "FATAL",
} as const);

/**
 * Log level type supporting both uppercase and lowercase
 */
export type LogLevel = keyof typeof LogLevels | Lowercase<keyof typeof LogLevels>;

/**
 * Runtime environments where Jitterbug can operate
 */
export const Runtime = Object.freeze({
  EDGE: "EDGE",
  NODE: "NODE",
  BROWSER: "BROWSER",
} as const);

/**
 * Deployment environments that affect logging behavior
 */
export const Environment = Object.freeze({
  DEVELOPMENT: "DEVELOPMENT",
  STAGING: "STAGING",
  PRODUCTION: "PRODUCTION",
  TEST: "TEST",
} as const);
