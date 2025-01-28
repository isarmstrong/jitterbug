export const Runtime = Object.freeze({
    EDGE: 'edge',
    BROWSER: 'browser',
    NODE: 'node'
} as const);

export type RuntimeType = typeof Runtime[keyof typeof Runtime];

export const LogLevels = Object.freeze({
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
} as const);

export type LogLevel = typeof LogLevels[keyof typeof LogLevels];

export const Environment = Object.freeze({
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test'
} as const);

export type EnvironmentType = typeof Environment[keyof typeof Environment]; 