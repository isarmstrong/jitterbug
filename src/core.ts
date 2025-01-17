import type {
  JitterbugInstance,
  JitterbugConfig,
  LogContext,
  LogEntry,
  JitterbugFactory,
  RuntimeType,
  EnvironmentType,
} from "./types/types.js";
import { LogLevels, Runtime, Environment } from "./types/enums.js";
import { processLog, writeLog } from "./logger.js";

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

/**
 * Core Jitterbug implementation
 */
export class JitterbugImpl implements JitterbugInstance {
  private enabled: boolean;
  private context: LogContext;
  private config: Required<JitterbugConfig>;

  constructor(config: JitterbugConfig) {
    this.config = {
      namespace: config.namespace,
      enabled: config.enabled ?? true,
      level: config.level ?? LogLevels.INFO,
      minLevel: config.minLevel ?? config.level ?? LogLevels.INFO,
      runtime: config.runtime ?? RuntimeDetector.detectRuntime(),
      environment: config.environment ?? RuntimeDetector.detectEnvironment(),
      processors: config.processors ?? [],
      transports: config.transports ?? [],
    };

    this.enabled = this.config.enabled;
    this.context = {
      timestamp: new Date().toISOString(),
      runtime: this.config.runtime,
      environment: this.config.environment,
      namespace: this.config.namespace,
    };
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

  render<T extends Record<string, unknown>>(message: string, data?: T): void {
    const entry = this.createEntry(LogLevels.DEBUG, message, data);
    entry.context.type = "render";
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
    this.config = { ...this.config, ...config };
  }

  private async processAndWrite<T extends Record<string, unknown>>(
    entry: LogEntry<T>,
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const processedEntry = await processLog(entry, this.config.processors);
      void writeLog(processedEntry, this.config.transports).catch(this.onError);
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
    level: (typeof LogLevels)[keyof typeof LogLevels],
    message: string,
    data?: T,
    error?: Error,
  ): LogEntry<T> => {
    return {
      level,
      message,
      data,
      error,
      context: {
        ...this.context,
        timestamp: new Date().toISOString(),
      },
    };
  };

  private readonly shouldLog = (
    level: (typeof LogLevels)[keyof typeof LogLevels],
  ): boolean => {
    const levels = Object.values(LogLevels);
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return this.enabled && currentLevelIndex >= minLevelIndex;
  };

  private readonly updateConfig = (config: Partial<JitterbugConfig>): void => {
    this.config = { ...this.config, ...config };
  };

  private async log<T extends Record<string, unknown>>(
    level: (typeof LogLevels)[keyof typeof LogLevels],
    message: string,
    data?: T,
    error?: Error,
  ): Promise<void> {
    const entry = this.createEntry(level, message, data, error);
    await this.processAndWrite(entry);
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
  const baseConfig: JitterbugConfig = {
    namespace: process.env.APP_NAME || "app",
    runtime: config.runtime ?? RuntimeDetector.detectRuntime(),
    environment: config.environment ?? RuntimeDetector.detectEnvironment(),
    processors: config.processors ?? [],
    transports: config.transports ?? [],
  };

  return createJitterbug({
    ...baseConfig,
    namespace: `${baseConfig.namespace}:${namespace}`,
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
