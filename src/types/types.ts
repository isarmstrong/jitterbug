import { LogLevels, Runtime, Environment } from "./enums";

/**
 * Log level type
 */
export type LogLevel = keyof typeof LogLevels;

/**
 * Runtime type
 */
export type RuntimeType = keyof typeof Runtime;

/**
 * Environment type
 */
export type EnvironmentType = keyof typeof Environment;

/**
 * Request context for API logging
 */
export interface RequestContext {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  requestId?: string;
  duration?: number;
  status?: number;
}

/**
 * Cache operation context
 */
export interface CacheContext {
  operation: "get" | "set" | "delete" | "has" | "clear";
  key: string;
  ttl?: number;
  size?: number;
  hit?: boolean;
  duration?: number;
}

/**
 * Core Jitterbug instance interface
 */
export interface JitterbugInstance {
  debug<T extends Record<string, unknown>>(message: string, data?: T): void;
  info<T extends Record<string, unknown>>(message: string, data?: T): void;
  warn<T extends Record<string, unknown>>(message: string, data?: T): void;
  error(message: string, error: Error, data?: Record<string, unknown>): void;
  fatal(message: string, error: Error, data?: Record<string, unknown>): void;
  render<T extends Record<string, unknown>>(message: string, data?: T): void;
  setContext(context: Partial<LogContext>): void;
  getContext(): LogContext;
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  configure(config: Partial<JitterbugConfig>): void;
}

/**
 * Factory interface for creating Jitterbug instances
 */
export interface JitterbugFactory {
  create: (config: JitterbugConfig) => JitterbugInstance;
  createDebug: (
    namespace: string,
    config?: Partial<JitterbugConfig>,
  ) => JitterbugInstance;
  getRuntime: () => RuntimeType;
  getEnvironment: () => EnvironmentType;
}

/**
 * Configuration interface
 */
export interface JitterbugConfig {
  namespace: string;
  enabled?: boolean;
  level?: LogLevel;
  minLevel?: LogLevel;
  runtime?: RuntimeType;
  environment?: EnvironmentType;
  processors?: LogProcessor[];
  transports?: LogTransport[];
}

/**
 * Log context interface
 */
export interface LogContext {
  timestamp: string;
  runtime: RuntimeType;
  environment: EnvironmentType;
  namespace: string;
  request?: RequestContext;
  cache?: CacheContext;
  [key: string]: unknown;
}

export interface EdgeContext extends LogContext {
  features?: {
    detected: Record<string, unknown>;
    risks: string[];
  };
  stream?: {
    conversion: {
      method: string;
      hasCleanup: boolean;
      maintainsBackpressure: boolean;
    };
    risks: string[];
  };
  cache?: CacheContext & {
    strategy?: string;
    operations?: Record<string, unknown>;
    risks?: string[];
  };
  memory?: {
    current: number;
    peak: number;
    limits: {
      max: number;
      warningThreshold: number;
    };
    risks: string[];
  };
}

/**
 * Log entry interface
 */
export interface LogEntry<T = Record<string, unknown>> {
  level: LogLevel;
  message: string;
  data?: T;
  error?: Error;
  context: LogContext;
}

/**
 * Log processor interface
 */
export interface LogProcessor {
  process<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<LogEntry<T>>;
  supports(runtime: RuntimeType): boolean;
  allowedIn(environment: EnvironmentType): boolean;
}

/**
 * Log transport interface
 */
export interface LogTransport {
  write<T extends Record<string, unknown>>(entry: LogEntry<T>): Promise<void>;
}
