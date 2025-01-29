/**
 * Runtime environment types for Jitterbug
 */
export const Runtime = Object.freeze({
    EDGE: 'edge',
    BROWSER: 'browser',
    NODE: 'node'
} as const);

export type RuntimeType = typeof Runtime[keyof typeof Runtime];

/**
 * Log levels following standard logging conventions
 */
export const LogLevels = Object.freeze({
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
} as const);

export type LogLevel = typeof LogLevels[keyof typeof LogLevels];

/**
 * Deployment environments
 */
export const Environment = Object.freeze({
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test'
} as const);

export type EnvironmentType = typeof Environment[keyof typeof Environment];

/**
 * Type guards for runtime type checking
 */
export const isRuntime = (value: unknown): value is RuntimeType => {
    return typeof value === 'string' && Object.values(Runtime).includes(value as RuntimeType);
};

export const isLogLevel = (value: unknown): value is LogLevel => {
    return typeof value === 'string' && Object.values(LogLevels).includes(value as LogLevel);
};

export const isEnvironment = (value: unknown): value is EnvironmentType => {
    return typeof value === 'string' && Object.values(Environment).includes(value as EnvironmentType);
};

/**
 * Type assertions for development
 */
export const assertRuntime = (value: unknown): RuntimeType => {
    if (!isRuntime(value)) {
        throw new TypeError(`Invalid runtime: ${String(value)}`);
    }
    return value;
};

export const assertLogLevel = (value: unknown): LogLevel => {
    if (!isLogLevel(value)) {
        throw new TypeError(`Invalid log level: ${String(value)}`);
    }
    return value;
};

export const assertEnvironment = (value: unknown): EnvironmentType => {
    if (!isEnvironment(value)) {
        throw new TypeError(`Invalid environment: ${String(value)}`);
    }
    return value;
}; 