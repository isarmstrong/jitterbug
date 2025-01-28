export const LogLevels = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
} as const;

export const Runtime = {
    NODE: 'NODE',
    EDGE: 'EDGE',
    BROWSER: 'BROWSER'
} as const;

export const Environment = {
    DEVELOPMENT: 'DEVELOPMENT',
    STAGING: 'STAGING',
    PRODUCTION: 'PRODUCTION',
    TEST: 'TEST'
} as const;

// Export types based on the const values
export type LogLevel = typeof LogLevels[keyof typeof LogLevels];
export type RuntimeType = typeof Runtime[keyof typeof Runtime];
export type EnvironmentType = typeof Environment[keyof typeof Environment]; 