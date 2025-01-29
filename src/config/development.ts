import type { JitterbugConfig, JitterbugInstance } from '../types/core';
import { LogLevels, Environment, Runtime } from '../types/enums';
import { ConsoleTransport } from '../transports/console';
import { createJitterbug } from '../core';

const defaultConfig: JitterbugConfig = {
    namespace: 'jitterbug',
    environment: Environment.DEVELOPMENT,
    level: LogLevels.DEBUG,
    runtime: Runtime.NODE,
    processors: [],
    transports: [
        new ConsoleTransport()
    ]
};

export function createDevConfig(namespace: string, overrides: Partial<JitterbugConfig> = {}): JitterbugConfig {
    return {
        ...defaultConfig,
        namespace,
        ...overrides
    };
}

export function createDevDebug(
    namespace: string,
    overrides: Partial<JitterbugConfig> = {}
): JitterbugInstance {
    return createJitterbug(createDevConfig(namespace, overrides));
}

// Re-export for convenience
export { createJitterbug }; 