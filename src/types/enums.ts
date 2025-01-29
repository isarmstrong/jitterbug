/**
 * Runtime environment types for Jitterbug
 */
export enum Runtime {
    EDGE = 'edge',
    BROWSER = 'browser',
    NODE = 'node'
}

/**
 * Log levels following standard logging conventions
 */
export enum LogLevels {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

/**
 * Deployment environments
 */
export enum Environment {
    DEVELOPMENT = 'development',
    STAGING = 'staging',
    PRODUCTION = 'production',
    TEST = 'test'
}

/**
 * Type guards for runtime type checking
 */
export const isRuntime = (value: unknown): value is Runtime => {
    return typeof value === 'string' && Object.values(Runtime).includes(value as Runtime);
};

export const isLogLevel = (value: unknown): value is LogLevels => {
    return typeof value === 'string' && Object.values(LogLevels).includes(value as LogLevels);
};

export const isEnvironment = (value: unknown): value is Environment => {
    return typeof value === 'string' && Object.values(Environment).includes(value as Environment);
};

/**
 * Type assertions for development
 */
export const assertRuntime = (value: unknown): Runtime => {
    if (!isRuntime(value)) {
        throw new TypeError(`Invalid runtime: ${String(value)}`);
    }
    return value;
};

export const assertLogLevel = (value: unknown): LogLevels => {
    if (!isLogLevel(value)) {
        throw new TypeError(`Invalid log level: ${String(value)}`);
    }
    return value;
};

export const assertEnvironment = (value: unknown): Environment => {
    if (!isEnvironment(value)) {
        throw new TypeError(`Invalid environment: ${String(value)}`);
    }
    return value;
};

// Export types based on the const values
export type LogLevel = typeof LogLevels[keyof typeof LogLevels];
export type RuntimeType = typeof Runtime[keyof typeof Runtime];
export type EnvironmentType = typeof Environment[keyof typeof Environment]; 