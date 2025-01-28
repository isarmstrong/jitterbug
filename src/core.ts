import {
  LogLevels,
  Runtime,
  Environment,
} from "./types";
import type {
  JitterbugInstance,
  JitterbugConfig,
  LogContext,
  LogEntry,
  JitterbugFactory,
  RuntimeType,
  EnvironmentType,
  LogTransport,
  LogLevel,
} from "./types";
import { processLog, writeLog } from "./logger";

declare global {
  // eslint-disable-next-line no-var
  var EdgeRuntime: string | undefined;
}

/**
 * Helper class for runtime and environment detection
 */
class RuntimeDetector {
  static detectRuntime(): RuntimeType {
    if (typeof EdgeRuntime !== "undefined") return Runtime.EDGE;

    if (
      typeof window !== "undefined" &&
      typeof window.document !== "undefined" &&
      typeof window.document.createElement !== "undefined"
    ) {
      return Runtime.BROWSER;
    }

    return Runtime.NODE;
  }

  static detectEnvironment(): EnvironmentType {
    const hasProcess = typeof process !== "undefined";
    const hasEnv =
      hasProcess && process.env !== undefined && process.env !== null;
    const nodeEnv = hasEnv ? process.env.NODE_ENV : undefined;

    if (nodeEnv === "development") {
      return Environment.DEVELOPMENT;
    }
    if (nodeEnv === "production") {
      return Environment.PRODUCTION;
    }
    if (nodeEnv === "test") {
      return Environment.TEST;
    }
    return Environment.DEVELOPMENT;
  }
}

/**
 * Core Jitterbug implementation
 */
export class JitterbugImpl implements JitterbugInstance {
  private enabled: boolean;
  private context: LogContext;
  private config: Required<JitterbugConfig>;
  private transports: LogTransport[] = [];

  constructor(config: JitterbugConfig) {
    this.config = {
      namespace: config.namespace ?? "default",
      runtime: config.runtime ?? RuntimeDetector.detectRuntime(),
      environment: config.environment ?? RuntimeDetector.detectEnvironment(),
      transports: config.transports ?? [],
      processors: config.processors ?? [],
      enabled: config.enabled ?? true,
      level: config.level ? this.normalizeLogLevel(config.level) : LogLevels.INFO,
      minLevel: config.minLevel
        ? this.normalizeLogLevel(config.minLevel)
        : this.normalizeLogLevel(config.level ?? LogLevels.INFO),
      onError: config.onError ?? this.onError,
      onWarn: config.onWarn ?? this.onWarn
    };

    this.enabled = this.config.enabled;
    this.context = this.getLogContext();

    this.setupTransports();
  }

  /**
   * Normalizes log level to uppercase for internal consistency
   */
  private normalizeLogLevel(level: string): LogLevel {
    const upperLevel = level.toUpperCase() as keyof typeof LogLevels;
    return LogLevels[upperLevel];
  }

  public debug<T extends Record<string, unknown>>(
    message: string,
    data?: T,
  ): void {
    void this.log(LogLevels.DEBUG, message, data);
  }

  public info<T extends Record<string, unknown>>(
    message: string,
    data?: T,
  ): void {
    void this.log(LogLevels.INFO, message, data);
  }

  public warn<T extends Record<string, unknown>>(
    message: string,
    data?: T,
  ): void {
    void this.log(LogLevels.WARN, message, data);
  }

  public error(
    message: string,
    error: Error,
    data?: Record<string, unknown>,
  ): void {
    void this.log(LogLevels.ERROR, message, data, error);
  }

  public fatal(
    message: string,
    error: Error,
    data?: Record<string, unknown>,
  ): void {
    void this.log(LogLevels.FATAL, message, data, error);
  }

  public render<T extends Record<string, unknown>>(message: string, data?: T): void {
    const entry = this.createEntry(LogLevels.DEBUG, message, data);
    const context = entry.context as LogContext;
    if (context) {
      context.type = "render";
    }
    void this.processAndWrite(entry).catch(this.onError);
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  configure(config: Partial<JitterbugConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      level: config.level ? this.normalizeLogLevel(config.level) : this.config.level,
      minLevel: config.minLevel
        ? this.normalizeLogLevel(config.minLevel)
        : this.config.minLevel
    };
    this.enabled = this.config.enabled;
  }

  private async processAndWrite<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const normalizedEntry = {
        ...entry,
        level: this.normalizeLogLevel(entry.level),
      };
      const processedEntry = await processLog(normalizedEntry, this.config.processors);
      void writeLog(processedEntry, this.transports).catch(this.onError);
    } catch (error) {
      this.onError(error as Error);
    }
  }

  private readonly onError = (error: Error): void => {
    console.error("Error in Jitterbug:", error);
  };

  private readonly onWarn = (warning: string): void => {
    console.warn("Warning in Jitterbug:", warning);
  };

  private readonly createEntry = <T extends Record<string, unknown>>(
    level: LogLevel,
    message: string,
    data?: T,
    error?: Error,
  ): LogEntry<T> => {
    const context = this.getLogContext();
    return {
      level,
      message,
      context: context as T,
      ...(data && { data }),
      ...(error && { error }),
      _metadata: {
        queueTime: Date.now(),
        sequence: 0,
        _size: 0
      }
    };
  };

  private getLogContext(): LogContext {
    return {
      timestamp: new Date().toISOString(),
      runtime: this.config.runtime,
      environment: this.config.environment,
      namespace: this.config.namespace,
      type: "log"
    };
  }

  private async log<T extends Record<string, unknown>>(
    level: LogLevel,
    message: string,
    data?: T,
    error?: Error,
  ): Promise<void> {
    if (!this.enabled) return;

    const levels = Object.values(LogLevels);
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);
    if (messageLevel < configLevel) return;

    const entry = this.createEntry(level, message, data, error);
    await this.processAndWrite(entry);
  }

  private setupTransports(): void {
    // Initialize transports from config
    this.transports = Array.isArray(this.config.transports)
      ? [...this.config.transports]
      : [];
  }
}

/**
 * Create a new Jitterbug instance
 */
export function createJitterbug(config: JitterbugConfig): JitterbugInstance {
  return new JitterbugImpl(config);
}

/**
 * Create a namespaced debug instance
 */
export function createDebug(
  namespace: string,
  config: Partial<JitterbugConfig> = {},
): JitterbugInstance {
  const appName = typeof process !== "undefined" && process.env?.APP_NAME;
  const defaultNamespace = "app";

  // Ensure we have a valid base namespace
  const baseNamespace =
    typeof appName === "string" && appName.trim().length > 0
      ? appName.trim()
      : defaultNamespace;

  const baseConfig: JitterbugConfig = {
    namespace: baseNamespace,
    runtime: config.runtime ?? RuntimeDetector.detectRuntime(),
    environment: config.environment ?? RuntimeDetector.detectEnvironment(),
    processors: config.processors ?? [],
    transports: config.transports ?? [],
    level: config.level ?? LogLevels.INFO,
    enabled: config.enabled ?? true,
    minLevel: config.minLevel ?? LogLevels.INFO,
    onError: config.onError ?? ((error: Error) => console.error("Error in Jitterbug:", error)),
    onWarn: config.onWarn ?? ((warning: string) => console.warn("Warning in Jitterbug:", warning))
  };

  return createJitterbug({
    ...baseConfig,
    namespace: `${baseNamespace}:${namespace}`,
    ...config,
  });
}

/**
 * Factory for creating Jitterbug instances
 */
export const factory: JitterbugFactory = {
  create: (config: JitterbugConfig): JitterbugInstance =>
    createJitterbug(config),
  createDebug: (
    namespace: string,
    config?: Partial<JitterbugConfig>,
  ): JitterbugInstance => createDebug(namespace, config),
  getRuntime: (): RuntimeType => RuntimeDetector.detectRuntime(),
  getEnvironment: (): EnvironmentType => RuntimeDetector.detectEnvironment(),
};
