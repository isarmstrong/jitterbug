/**
 * Runtime environment types
 */
export enum Runtime {
    EDGE = 'edge',
    BROWSER = 'browser',
    NODE = 'node'
}

/**
 * Log levels in order of severity
 */
export enum LogLevels {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

/**
 * Deployment environment types
 */
export enum Environment {
    DEVELOPMENT = 'development',
    STAGING = 'staging',
    PRODUCTION = 'production',
    TEST = 'test'
}

// Type guards for runtime type safety
export const isRuntime = (value: unknown): value is Runtime => {
    return typeof value === 'string' && Object.values(Runtime).includes(value as Runtime);
};

export const isLogLevel = (value: unknown): value is LogLevels => {
    return typeof value === 'string' && Object.values(LogLevels).includes(value as LogLevels);
};

export const isEnvironment = (value: unknown): value is Environment => {
    return typeof value === 'string' && Object.values(Environment).includes(value as Environment);
};

// Export types based on the const values
export type LogLevel = typeof LogLevels[keyof typeof LogLevels];
export type RuntimeType = typeof Runtime[keyof typeof Runtime];
export type EnvironmentType = typeof Environment[keyof typeof Environment]; 